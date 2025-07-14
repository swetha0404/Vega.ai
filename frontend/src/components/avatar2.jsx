import React, { useState, useRef, useEffect, useCallback } from 'react';
import './avatarLayout.css';

const Avatar2 = ({ isActive = false, textToSpeak = '' }) => {
  // State variables
  const [message, setMessage] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [mediaCanPlay, setMediaCanPlay] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
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
  const API_BASE = 'http://localhost:8000'; // Backend server URL
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
        if (event.track.kind === 'audio' || event.track.kind === 'video') {
          if (mediaElementRef.current) {
            mediaElementRef.current.srcObject = event.streams[0];
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

  const repeatHandler = async () => {
    if (!sessionInfo) {
      updateStatus('Please create a connection first');
      return;
    }
    
    if (!message.trim()) {
      updateStatus('Please enter a message');
      return;
    }

    // Use speakMessage for consistency
    speakMessage(message);
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
          setIsInterrupted(true);
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
        setIsInterrupted(true);
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
   * Closes the WebRTC connection and terminates the session
   */
  const stopSession = async () => {
    if (!sessionInfo) {
      updateStatus('No active session to stop');
      return;
    }

    updateStatus('Stopping session... please wait');
    
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
    if (!canvasElementRef.current || !mediaElementRef.current) return;

    const canvas = canvasElementRef.current;
    const mediaElement = mediaElementRef.current;
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

      canvas.width = mediaElement.videoWidth;
      canvas.height = mediaElement.videoHeight;

      ctx.drawImage(mediaElement, 0, 0, canvas.width, canvas.height);
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
    if (isActive && !isSessionActive && !isStartingSessionRef.current) {
      // Auto-start session when component becomes active
      startSession();
    } else if (!isActive && isSessionActive) {
      // Auto-stop session when component becomes inactive
      stopSession();
    }
  }, [isActive, isSessionActive]);

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

      mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, []);

  return (
    <div className="avatar-container">
      <div className="avatar-section">
        <div className="video-container">
          <video
            ref={mediaElementRef}
            autoPlay
            playsInline
            style={{ display: 'none' }}
          />
          <canvas
            ref={canvasElementRef}
            className="avatar-canvas"
            width={512}
            height={512}
            style={{ 
              display: 'block',
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
        
        {/* Volume Control and Interrupt Button - Below Video - Using Avatar.jsx styling */}
        <div className="avatar-controls">
          <div className="avatar-volume-control">
            <span className="volume-label">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
            <span className="volume-value">{Math.round(volume * 100)}%</span>
          </div>
          
          <button
            className="avatar-interrupt-button"
            onClick={interruptHandler}
            disabled={!isSessionActive || isInterrupting}
          >
            {isInterrupting ? '...' : 'Stop'}
          </button>
        </div>
        
        {/* Manual Session Controls - Only show when not used as controlled component */}
        {!isActive && (
          <div className="session-controls">
            <button 
              className="start-button"
              onClick={startSession} 
              disabled={isSessionActive}
              style={{ 
                backgroundColor: isSessionActive ? '#ccc' : '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                marginRight: '10px',
                border: 'none',
                borderRadius: '4px',
                cursor: isSessionActive ? 'not-allowed' : 'pointer'
              }}
            >
              {isSessionActive ? '✅ Session Active' : '🎬 Start Session'}
            </button>
            
            <button 
              className="stop-button"
              onClick={stopSession} 
              disabled={!isSessionActive}
              style={{ 
                backgroundColor: !isSessionActive ? '#ccc' : '#f44336',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: !isSessionActive ? 'not-allowed' : 'pointer'
              }}
            >
              🛑 Stop Session
            </button>
          </div>
        )}
        
        {/* Manual Text Input - Only show when not used as controlled component */}
        {!isActive && (
          <div className="text-input-section">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Message:
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter message for avatar"
                disabled={!isSessionActive}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  minWidth: '300px',
                  backgroundColor: !isSessionActive ? '#f5f5f5' : 'white'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isSessionActive) {
                    repeatHandler();
                  }
                }}
              />
            </label>
            
            <button
              className="speak-button"
              onClick={repeatHandler}
              disabled={!isSessionActive || !message.trim()}
              style={{ 
                backgroundColor: (!isSessionActive || !message.trim()) ? '#ccc' : '#2196F3',
                color: 'white',
                padding: '8px 16px',
                marginLeft: '10px',
                border: 'none',
                borderRadius: '4px',
                cursor: (!isSessionActive || !message.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              🗣️ Repeat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Avatar2;