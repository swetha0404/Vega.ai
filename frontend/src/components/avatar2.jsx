import React, { useState, useRef, useEffect, useCallback } from 'react';
import './avatarLayout.css';

const Avatar2 = ({ isActive = false, textToSpeak = '' }) => {
  // State variables
  const [sessionInfo, setSessionInfo] = useState(null);
  const [mediaCanPlay, setMediaCanPlay] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [userStoppedManually, setUserStoppedManually] = useState(false); // Track manual stops
  const [volume, setVolume] = useState(1.0); // Default volume at 100%
  const [isInterrupting, setIsInterrupting] = useState(false); // Track if interruption is in progress

  const mediaElementRef = useRef(null);
  const canvasElementRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const renderIdRef = useRef(0);
  const dataChannelRef = useRef(null);
  const apiPromiseRef = useRef(null);
  const previousTextRef = useRef('');
  const isStartingSessionRef = useRef(false); // Prevent multiple session starts

  // Default avatar and voice configuration
  const defaultAvatarId = 'Alessandra_ProfessionalLook2_public';
  const defaultVoiceId = null; // Use null to let avatar use its default voice

  // API configuration
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Backend server URL
  const heygen_API = {
    apiKey: '',
    serverUrl: 'https://api.heygen.com',
    isConfigured: false
  };

  // Background image from public/backgrounds folder
  const defaultBackground = 'url("backgrounds/office_window.gif") center / cover no-repeat';

  const updateStatus = (message) => {
    console.log(`Avatar2: ${message}`);
  };

  const getAPI = async () => {
    // If already configured, return immediately
    if (heygen_API.isConfigured) {
      return true;
    }
    
    // If a fetch is already in progress, return that promise
    if (apiPromiseRef.current) {
      return apiPromiseRef.current;
    }
    
    // Start a new fetch and store the promise
    apiPromiseRef.current = (async () => {
      try {
        const response = await fetch(`${API_BASE}/heygenAPI`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || `Server error: ${response.status}`;
          } catch {
            errorMessage = `Server error: ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.apiKey) {
          throw new Error('API key not found in server response');
        }

        // Update the heygen_API object with the received data
        heygen_API.apiKey = data.apiKey;
        if (data.url) {
          heygen_API.serverUrl = data.url;
        }
        
        heygen_API.isConfigured = true;
        
        return true;
      } catch (error) {
        console.error('Avatar: Error fetching HeyGen API:', error);
        updateStatus(`❌ Failed to fetch API configuration: ${error.message}`);
        return false;
      } finally {
        // Clear the promise once done (success or failure)
        apiPromiseRef.current = null;
      }
    })();
    
    return apiPromiseRef.current;
  };

  /**
   * Callback for handling data messages received through WebRTC data channel
   */
  const onMessage = (event) => {
    // Silently handle data channel messages - no need to log them
  };

  /**
   * Creates a new WebRTC session with HeyGen's streaming avatar service
   * Now combines session creation and starting into one step
   */
  const startSession = async () => {
    // Prevent multiple simultaneous session starts
    if (isStartingSessionRef.current) {
      console.log('Avatar2: Session start already in progress, skipping');
      return;
    }
    
    isStartingSessionRef.current = true;
    updateStatus('Starting session... please wait');

    try {
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        updateStatus('❌ Failed to configure API');
        setInitializationFailed(true);
        return;
      }

      updateStatus('✅ API configured successfully');
      updateStatus(`Creating session with avatar: ${defaultAvatarId}`);

      // Create session with default avatar and voice
      const sessionData = await newSession('low', defaultAvatarId, defaultVoiceId);
      
      if (!sessionData) {
        throw new Error('Failed to create session - no data returned');
      }

      setSessionInfo(sessionData);
      updateStatus('✅ Session created successfully');
      
      // Check if we have the required properties
      if (!sessionData.sdp || !sessionData.ice_servers2) {
        console.error('Missing required session data:', sessionData);
        throw new Error('Invalid session data structure');
      }

      const { sdp: serverSdp, ice_servers2: iceServers } = sessionData;

      // Create a new WebRTC peer connection with ICE servers from HeyGen
      peerConnectionRef.current = new RTCPeerConnection({ iceServers: iceServers });

      // When audio and video streams are received from HeyGen, display them in the video element
      peerConnectionRef.current.ontrack = (event) => {
        updateStatus('✅ Video track received');
        console.log('Video track received:', event.track.kind, event.streams[0]);
        if (event.track.kind === 'audio' || event.track.kind === 'video') {
          if (mediaElementRef.current) {
            mediaElementRef.current.srcObject = event.streams[0];
            // Trigger canvas rendering after a short delay to ensure video is ready
            setTimeout(() => {
              renderCanvas();
            }, 100);
          }
        }
      };

      // When receiving a message, display it in the status element
      peerConnectionRef.current.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = onMessage;
        dataChannelRef.current = dataChannel;
      };

      // Set server's SDP as remote description
      const remoteDescription = new RTCSessionDescription(serverSdp);
      await peerConnectionRef.current.setRemoteDescription(remoteDescription);
      updateStatus('✅ Remote description set');

      // Create and set local SDP description
      const localDescription = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(localDescription);
      updateStatus('✅ Local description set');

      // When ICE candidate is available, send to the server
      peerConnectionRef.current.onicecandidate = ({ candidate }) => {
        if (candidate) {
          handleICE(sessionData.session_id, candidate.toJSON());
        }
      };

      // When ICE connection state changes, display the new state
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        updateStatus(`ICE connection state: ${peerConnectionRef.current.iceConnectionState}`);
      };

      // Start the streaming session with HeyGen
      updateStatus('Starting streaming session...');
      await startStreamingSession(sessionData.session_id, localDescription);

      // Configure media receivers to adjust buffer size for smoother playback
      const receivers = peerConnectionRef.current.getReceivers();
      receivers.forEach((receiver) => {
        receiver.jitterBufferTarget = 500; // Set buffer to 500ms to reduce stuttering
      });

      setIsSessionActive(true);
      updateStatus('🎉 Session started successfully! You can now send messages to the avatar.');
    } catch (error) {
      console.error('Error starting session:', error);
      updateStatus('❌ Error starting session: ' + error.message);
      
      // Mark initialization as failed
      setInitializationFailed(true);
      
      // Clean up on error
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setSessionInfo(null);
      setIsSessionActive(false);
    } finally {
      isStartingSessionRef.current = false;
    }
  };

  // Simplified helper function to speak a message - defined early to avoid reference errors
  const speakMessage = useCallback(async (message) => {
    if (!sessionInfo?.session_id || !isSessionActive) {
      return;
    }
    
    // Ensure API is configured before speaking
    const apiConfigured = await getAPI();
    if (!apiConfigured || !heygen_API.apiKey) {
      console.log('Avatar2: Cannot speak - API not configured');
      return;
    }
    
    updateStatus('Avatar speaking...');
    
    // Sanitize text to remove problematic characters
    const sanitizedText = message
      .replace(/[^\w\s.,!?;:()\-"']/g, '') // Remove special chars
      .trim()
      .substring(0, 900); // More conservative length limit
    
    try {
      await repeat(sessionInfo.session_id, sanitizedText);
      updateStatus('Avatar ready');
    } catch (error) {
      console.error(`Avatar2: Speaking error:`, error.message);
      updateStatus('Communication issue - please continue with text');
    }
  }, [sessionInfo, isSessionActive]);

  /**
   * Interrupts current speech and speaks new text
   */
  const speakTextWithInterrupt = async (text) => {
    if (!sessionInfo?.session_id || !text.trim()) {
      console.log('Avatar2: ❌ No session or empty text for speaking');
      return;
    }

    try {
      // First interrupt any current speech
      console.log('Avatar2: 🛑 Interrupting current speech for new message');
      await interruptHandler();
      
      // Small delay to ensure interruption is processed, then speak
      setTimeout(() => {
        // console.log('Avatar2: 🗣️ Speaking new text after interrupt:', text);
        speakMessage(text);
      }, 300); // Delay to ensure interrupt is processed
    } catch (error) {
      console.log(`Avatar2: ❌ Error speaking text with interrupt: ${error.message}`);
    }
  };

  /**
   * Interrupts the avatar's current speech
   */
  const interruptHandler = async () => {
    if (!sessionInfo) {
      updateStatus('Please create a connection first');
      return;
    }

    updateStatus('Interrupting avatar...');
    setIsInterrupting(true);
    
    try {
      const apiConfigured = await getAPI();
      if (!apiConfigured) return;

      // First try to use a dedicated interrupt endpoint if it exists
      try {
        const interruptResponse = await fetch(`${heygen_API.serverUrl}/v1/streaming.interrupt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': heygen_API.apiKey,
          },
          body: JSON.stringify({ session_id: sessionInfo.session_id }),
        });

        if (interruptResponse.ok) {
          updateStatus('Avatar interrupted successfully (using interrupt endpoint)');
          return;
        }
      } catch (interruptError) {
        console.log('Interrupt endpoint not available, trying alternative method');
      }

      // Fallback: Use task endpoint with minimal text
      const interruptionMethods = [
        ' ',           // Single space
        '.',           // Single period
        'stop',        // Stop command
      ];

      let success = false;
      
      for (const method of interruptionMethods) {
        try {
          await repeat(sessionInfo.session_id, method);
          success = true;
          updateStatus(`Avatar interrupted successfully (using text: "${method}")`);
          break;
        } catch (error) {
          console.log(`Interrupt method "${method}" failed:`, error.message);
          continue;
        }
      }

      if (success) {
        updateStatus('Avatar interrupted successfully');
      } else {
        updateStatus('Failed to interrupt avatar - all methods failed');
      }
    } catch (error) {
      console.error('Error interrupting avatar:', error);
      updateStatus('Error interrupting avatar: ' + error.message);
    } finally {
      setIsInterrupting(false);
    }
  };

  /**
   * Closes the WebRTC connection and terminates the session (manual stop)
   */
  const stopSession = async () => {
    if (!sessionInfo) {
      updateStatus('No active session to stop');
      return;
    }

    updateStatus('Stopping session... please wait');
    
    // Set manual stop flag to prevent automatic restart
    setUserStoppedManually(true);
    
    await terminateSessionInternal();
  };

  /**
   * Closes the WebRTC connection and terminates the session (automatic stop)
   */
  const stopSessionAutomatic = async () => {
    if (!sessionInfo) {
      return;
    }

    updateStatus('Stopping session... please wait');
    
    // Don't set manual stop flag for automatic stops
    await terminateSessionInternal();
  };

  /**
   * Manually restarts the session (clears the manual stop flag)
   */
  const restartSession = async () => {
    setUserStoppedManually(false);
    setInitializationFailed(false); // Also reset initialization failure
    // The useEffect will automatically start the session when userStoppedManually becomes false
  };

  /**
   * Internal function to handle session termination
   */
  const terminateSessionInternal = async () => {
    try {
      const apiConfigured = await getAPI();
      if (!apiConfigured) return;

      // Close local connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Call the close interface
      await terminateSession(sessionInfo.session_id);
      
      // Reset state
      setSessionInfo(null);
      setIsSessionActive(false);
      setMediaCanPlay(false);
      renderIdRef.current++;
      isStartingSessionRef.current = false; // Reset session starting flag
      previousTextRef.current = ''; // Clear previous text
      
      updateStatus('Session stopped successfully');
    } catch (error) {
      console.error('Failed to stop the session:', error);
      updateStatus('Error stopping session: ' + error.message);
    }
  };


  /**
   * Creates a new streaming session with HeyGen API
   */
  const newSession = async (quality, avatar_name, voice_id) => {
    // Build the request body - only include voice if voice_id is provided
    const requestBody = {
      quality,
      avatar_name,
    };

    // Only add voice configuration if voice_id is provided
    if (voice_id) {
      requestBody.voice = {
        voice_id: voice_id,
      };
    }

    console.log('Creating session with payload:', requestBody);

    const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      updateStatus(`Server Error (${response.status}): ${errorText}`);
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('newSession response:', data);
    
    if (!data || !data.data) {
      throw new Error('Invalid response structure from HeyGen API');
    }
    
    return data.data;
  };

  /**
   * Starts a streaming session with HeyGen API
   */
  const startStreamingSession = async (session_id, sdp) => {
    const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.apiKey,
      },
      body: JSON.stringify({ session_id, sdp }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('startStreamingSession error:', response.status, errorText);
      updateStatus(`Start streaming error (${response.status}): ${errorText}`);
      throw new Error(`Start streaming error: ${response.status}`);
    }

    const data = await response.json();
    console.log('startStreamingSession response:', data);
    return data.data;
  };

  /**
   * Sends ICE candidates to HeyGen's server for WebRTC connection
   */
  const handleICE = async (session_id, candidate) => {
    const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.ice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.apiKey,
      },
      body: JSON.stringify({ session_id, candidate }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('handleICE error:', response.status, errorText);
      // Don't update status for ICE errors as they might be frequent
      throw new Error(`ICE error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  };

  /**
   * Sends text for the avatar to speak
   */
  const repeat = async (session_id, text) => {
    const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.apiKey,
      },
      body: JSON.stringify({ session_id, text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('repeat error:', response.status, errorText);
      updateStatus(`Repeat error (${response.status}): ${errorText}`);
      throw new Error(`Repeat error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  };

  /**
   * Terminates a streaming session
   */
  const terminateSession = async (session_id) => {
    const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.apiKey,
      },
      body: JSON.stringify({ session_id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('terminateSession error:', response.status, errorText);
      updateStatus(`Stop session error (${response.status}): ${errorText}`);
      throw new Error(`Stop session error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  };

  /**
   * Renders video frames to canvas with green screen removal
   */
  const renderCanvas = () => {
    if (!canvasElementRef.current || !mediaElementRef.current) {
      console.log('renderCanvas: Missing canvas or media element');
      return;
    }

    const canvas = canvasElementRef.current;
    const mediaElement = mediaElementRef.current;
    
    console.log('renderCanvas: Starting canvas rendering');
    
    // Ensure canvas is visible
    canvas.style.display = 'block';
    canvas.classList.add('show');

    // Generate unique ID to track this specific render process
    const curRenderID = Math.trunc(Math.random() * 1000000000);
    renderIdRef.current = curRenderID;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Set background image
    if (canvas.parentElement) {
      canvas.parentElement.style.background = defaultBackground;
    }

    /**
     * Process and render each video frame with background removal
     */
    const processFrame = () => {
      if (curRenderID !== renderIdRef.current) return; // Stop if another render started

      // Check if video is ready
      if (mediaElement.readyState < 2) {
        requestAnimationFrame(processFrame);
        return;
      }

      // Keep canvas dimensions to match avatar's actual width
      const fixedWidth = 400;
      const fixedHeight = 600;
      
      canvas.width = fixedWidth;
      canvas.height = fixedHeight;

      // Calculate scaling to fit video into canvas while maintaining aspect ratio
      const videoWidth = mediaElement.videoWidth || fixedWidth;
      const videoHeight = mediaElement.videoHeight || fixedHeight;
      
      // Skip if video dimensions are not available
      if (videoWidth === 0 || videoHeight === 0) {
        requestAnimationFrame(processFrame);
        return;
      }
      
      // Use a smaller scale to make the avatar appear smaller within the canvas
      const scale = Math.max(fixedWidth / videoWidth, fixedHeight / videoHeight) * 0.93; // 93% of original size
      const scaledWidth = videoWidth * scale;
      const scaledHeight = videoHeight * scale;
      
      // Center the video in the canvas
      const offsetX = (fixedWidth - scaledWidth) / 2;
      const offsetY = (fixedHeight - scaledHeight) / 2;

      // Clear canvas first
      ctx.clearRect(0, 0, fixedWidth, fixedHeight);
      
      // Draw video frame
      try {
        ctx.drawImage(mediaElement, offsetX, offsetY, scaledWidth, scaledHeight);
      } catch (error) {
        console.log('Error drawing video frame:', error);
        requestAnimationFrame(processFrame);
        return;
      }
      
      // Apply green screen removal
      ctx.getContextAttributes().willReadFrequently = true;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];

        // Remove green screen
        if (isCloseToGreen([red, green, blue])) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  /**
   * Determines if a pixel color is close to green (for green screen removal)
   */
  const isCloseToGreen = (color) => {
    const [red, green, blue] = color;
    return green > 90 && red < 90 && blue < 90;
  };

  // Simplified effect for handling text to speak changes
  useEffect(() => {
    // Only speak if we have text, a valid session, and the component is active
    if (textToSpeak && sessionInfo && sessionInfo.session_id && isActive && isSessionActive) {
      const trimmedText = textToSpeak.trim();
      
      // Check if this is the same text we just processed (to avoid duplicates)
      if (trimmedText && trimmedText !== previousTextRef.current) {
        previousTextRef.current = trimmedText;
        
        // Just speak the message - no complex queuing logic (now async)
        speakMessage(trimmedText).catch(error => {
          console.error('Avatar2: Error in speakMessage:', error);
        });
      }
    }
  }, [textToSpeak, sessionInfo, isActive, isSessionActive, speakMessage]);

  // Effect to manage avatar session lifecycle
  useEffect(() => {
    if (isActive && !isSessionActive && !isStartingSessionRef.current && !userStoppedManually) {
      // Auto-start session when component becomes active (only if user hasn't manually stopped)
      startSession();
    } else if (!isActive && isSessionActive) {
      // Auto-stop session when component becomes inactive (but don't set manual stop flag)
      stopSessionAutomatic();
    }
  }, [isActive, isSessionActive, userStoppedManually]);

  // Effect to reset manual stop flag when component becomes inactive then active again
  useEffect(() => {
    if (!isActive) {
      // Reset manual stop flag when component becomes inactive
      // This allows the session to restart when component becomes active again
      setUserStoppedManually(false);
    }
  }, [isActive]);

  // Effect to handle volume changes
  useEffect(() => {
    if (mediaElementRef.current && mediaCanPlay) {
      mediaElementRef.current.volume = volume;
    }
  }, [volume, mediaCanPlay]);

  // Effect to start background removal when video loads
  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (mediaElement) {
      const handleLoadedMetadata = () => {
        setMediaCanPlay(true);
        mediaElement.play();
        // Start background removal immediately
        renderCanvas();
      };

      const handleCanPlay = () => {
        setMediaCanPlay(true);
        // Also trigger canvas rendering when video can play
        renderCanvas();
      };

      const handlePlaying = () => {
        // Ensure canvas rendering starts when video is actually playing
        renderCanvas();
      };

      mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.addEventListener('canplay', handleCanPlay);
      mediaElement.addEventListener('playing', handlePlaying);
      
      return () => {
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.removeEventListener('canplay', handleCanPlay);
        mediaElement.removeEventListener('playing', handlePlaying);
      };
    }
  }, [sessionInfo]); // Add sessionInfo dependency to re-setup when session changes

  // Prepare UI states
  const isInitializing = !sessionInfo && isActive && !initializationFailed && !userStoppedManually;
  const showFallbackUI = initializationFailed || userStoppedManually;
  
  // If not active, render nothing
  if (!isActive) {
    return null;
  }
  
  // Fallback UI when avatar can't be initialized or user stopped manually
  if (showFallbackUI) {
    const fallbackMessage = userStoppedManually ? 
      'You sent vega for tea.' : 
      'Vega has gone on a tea break.';
    
    const fallbackSubtext = userStoppedManually ?
      'Click Start to call her back.' :
      'Please chat with the copilot for assistance. (You can still use the mic to talk)';

    return (
      <div className="Avatar-component">
        <div className="avatar-container">
          <div style={{ 
            position: 'relative',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '300px', // Match the avatar section width
            // height: 'fit-content',
            // maxHeight: '420px',
            minHeight: '560px',
            color: 'white',
            padding: '20px 15px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #244D52, #1A3A3F, #0F2426)',
            borderRadius: '8px',
            alignSelf: 'center',
          }}>
            <div style={{ 
              backgroundColor: '#53C1DE', 
              borderRadius: '50%', 
              width: '70px', 
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '15px',
              flexShrink: 0
            }}>
              <img src={userStoppedManually ? '/tea-logo.png' : '/tea-logo.png'} style={{width: '50px', height: '70px'}}/>
            </div>
            <h3 style={{ marginBottom: '12px', color:'snow', fontSize: '16px', whiteSpace: 'nowrap' }}>
              {fallbackMessage}
            </h3>
            <p style={{ marginBottom: '20px', opacity: 0.8, fontSize: '14px', color:'snow', textAlign: 'center' }}>
              {fallbackSubtext}
            </p>
            
            {/* Show Start button when user stopped manually */}
            {userStoppedManually && (
              <button
                className="avatar-start-button"
                onClick={restartSession}
                disabled={isStartingSessionRef.current}
                style={{ 
                  marginTop: '10px',
                  padding: '8px 20px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                {isStartingSessionRef.current ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="Avatar-component">
      <div className="avatar-container">
        <div className="avatar-section" style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          maxWidth: '280px', // Reduced to match smaller canvas with some padding
          maxHeight: '450px'
        }}>
          <div className="video-container" style={{
            position: 'relative',
            width: '100%',
            height: 'fit-content',
            maxHeight: '390px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden', // Hide overflow to prevent cut-off appearance
            borderRadius: '8px'
          }}>
            {/* Loading overlay */}
            {isInitializing && (
              <div className="avatar-loading" style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px', 
                backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                color: 'white',
                zIndex: 10
              }}>
                <div className="avatar-spinner"></div>
                <div style={{color: 'snow'}}>Initializing Avatar...</div>
              </div>
            )}
            
            <video
              ref={mediaElementRef}
              autoPlay
              playsInline
              style={{ display: 'none' }}
            />
            <canvas
              ref={canvasElementRef}
              className="avatar-canvas"
              width={400}
              height={400}
              style={{ 
                display: 'block',
                width: '220px',
                height: '350px',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover', // Use cover to fill the container and show full avatar
                border: '2px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }}
            />
            
            {/* Volume Control - Overlaid at bottom of avatar */}
            <div className="avatar-volume-control" style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '4px 12px',
              borderRadius: '16px',
              color: 'white',
              fontSize: '12px',
              zIndex: 5
            }}>
              <span className="volume-label">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{
                  width: '80px',
                  height: '4px',
                  background: '#ddd',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <span className="volume-value">{Math.round(volume * 100)}%</span>
            </div>
          </div>
          
          {/* Buttons - Below Avatar */}
          <div className="avatar-button-group" style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: '260px', // Match the avatar section width
            marginTop: '10px',
            flexWrap: 'wrap'
          }}>
            {/* Show Interrupt button only when session is active */}
            {isSessionActive && (
              <button
                className="avatar-interrupt-button"
                onClick={interruptHandler}
                disabled={isInterrupting}
                style={{
                  flex: '1 1 auto',
                  minWidth: '80px',
                  maxWidth: '100px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                {isInterrupting ? '...' : 'Interrupt'}
              </button>
            )}
            
            {/* Show Stop button when session is active */}
            {isSessionActive && (
              <button
                className="avatar-stop-button"
                onClick={stopSession}
                style={{
                  flex: '1 1 auto',
                  minWidth: '80px',
                  maxWidth: '100px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #dc3545 0%, #e91e63 100%)',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                Stop
              </button>
            )}
            
            {/* Show Start button when session is not active and not manually stopped */}
            {!isSessionActive && !userStoppedManually && (
              <button
                className="avatar-start-button"
                onClick={restartSession}
                disabled={isStartingSessionRef.current}
                style={{
                  flex: '1 1 auto',
                  minWidth: '100px',
                  maxWidth: '140px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                {isStartingSessionRef.current ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Avatar2;