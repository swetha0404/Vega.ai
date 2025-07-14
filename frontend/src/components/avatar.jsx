import { useState, useRef, useEffect, useCallback } from 'react';
import './avatarLayout.css';

function Avatar({ isActive = false, textToSpeak = '' }) {

  const [sessionInfo, setSessionInfo] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [mediaCanPlay, setMediaCanPlay] = useState(false);
  const [renderID, setRenderID] = useState(0);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [volume, setVolume] = useState(1.0); // Default volume at 100%
  const [isInterrupting, setIsInterrupting] = useState(false); // Track if interruption is in progress
  const apiPromiseRef = useRef(null);
  const previousTextRef = useRef('');
  const sessionIdRef = useRef(null);
  const mediaElementRef = useRef(null);
  const cleanupAttemptedRef = useRef(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/";

  const heygen_API = {
    apiKey: '',
    serverUrl: 'https://api.heygen.com', // Default URL until actual value is fetched
    isConfigured: false
  };

  const updateStatus = (message) => {
    console.log(`Avatar: ${message}`);
  }
  
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
        console.log('Avatar: Fetching HeyGen API configuration from backend');

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
        console.log('Avatar: HeyGen API configuration updated:', heygen_API.serverUrl);
        
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

  
  // Simplified helper function to speak a message - defined early to avoid reference errors
  const speakMessage = useCallback((message) => {
    if (!sessionInfo?.session_id || isClosingSession) return;
    
    console.log(`Avatar: Speaking message (session ${sessionInfo.session_id})`);
    updateStatus('Avatar speaking...');
    
    // Sanitize text to remove problematic characters
    const sanitizedText = message
      .replace(/[^\w\s.,!?;:()\-"']/g, '') // Remove special chars
      .trim()
      .substring(0, 900); // More conservative length limit
    
    repeat(sessionInfo.session_id, sanitizedText)
      .then(() => {
        updateStatus('Avatar ready');
      })
      .catch(error => {
        console.error(`Avatar: Speaking error:`, error.message);
        updateStatus('Communication issue - please continue with text');
      });
  }, [sessionInfo, isClosingSession]);

  // Cleanup session function - extracted for reuse
  const cleanupSession = useCallback(async (sessionId = null) => {
    const targetSessionId = sessionId || (sessionInfo && sessionInfo.session_id);
    sessionIdRef.current = null;
    
    if (targetSessionId) {
      setIsClosingSession(true);
      updateStatus(`Closing avatar session ${targetSessionId}...`);
      
      // First close the peer connection
      if (peerConnection) {
        try {
          peerConnection.close();
        } catch (err) {
          console.error('Error closing WebRTC connection:', err);
        }
      }
      
      // Reset UI state
      setRenderID(prevID => prevID + 1);
      setMediaCanPlay(false);
      setPeerConnection(null);
      setSessionInfo(null);
      
      // Ensure we close the session on the server
      try {
        console.log(`Avatar: Closing session ${targetSessionId}`);
        await stopSession(targetSessionId);
        console.log(`Avatar: Session ${targetSessionId} closed successfully`);
      } catch (err) {
        console.error(`Avatar: Failed to close session ${targetSessionId}:`, err.message);
      } finally {
        setIsClosingSession(false);
        cleanupAttemptedRef.current = true;
      }
    }
  }, [peerConnection, sessionInfo]);
  
  // Fetch API configuration when component mounts
  useEffect(() => {
    // Start fetching API config as soon as possible
    if (isActive) {
      getAPI().catch(err => {
        console.error('Failed to pre-fetch HeyGen API configuration:', err);
      });
    }
  }, [isActive]);

  // Effect for handling session lifecycle based on isActive prop
  useEffect(() => {
    let isMounted = true;
    cleanupAttemptedRef.current = false;
    
    const setupSession = async () => {
      // Don't attempt if already closing, failed too many times, or not active
      if (!isActive || isClosingSession || (sessionInfo && sessionInfo.session_id) || 
          initializationFailed || retryCount >= 2 || !isMounted) {
        return;
      }
      
      try {
        updateStatus('Creating new session...');
        setInitializationFailed(false);
        
        // First ensure API is configured
        const apiConfigured = await getAPI();
        if (!apiConfigured) {
          throw new Error('Failed to initialize HeyGen API configuration');
        }
        
        // Create session with hardcoded avatar (using default voice)
        const avatar = 'Marianne_ProfessionalLook2_public';
        const sessionData = await newSession('low', avatar);
        
        if (!isMounted) return;
        setRetryCount(0); // Reset retry count on success
        
        // Store session ID for logging
        sessionIdRef.current = sessionData.session_id;
        console.log(`Avatar: New session created with ID: ${sessionData.session_id}`);
        
        const { sdp: serverSdp, ice_servers2: iceServers } = sessionData;
        const connection = new RTCPeerConnection({ iceServers });

        connection.ontrack = (event) => {
          if (isMounted && mediaElementRef.current && event.streams[0]) {
            mediaElementRef.current.srcObject = event.streams[0];
          }
        };

        const remoteDescription = new RTCSessionDescription(serverSdp);
        await connection.setRemoteDescription(remoteDescription);
        
        setPeerConnection(connection);
        setSessionInfo(sessionData);
        
        updateStatus('Session created successfully');
        
        if (!isMounted) return;
        
        const localDescription = await connection.createAnswer();
        await connection.setLocalDescription(localDescription);

        connection.onicecandidate = ({ candidate }) => {
          if (candidate && isMounted && sessionData.session_id) {
            handleICE(sessionData.session_id, candidate.toJSON())
              .catch(err => console.error('ICE candidate error:', err.message));
          }
        };

        // Only log significant connection state changes to reduce noise
        connection.oniceconnectionstatechange = () => {
          if (isMounted && 
             (connection.iceConnectionState === 'connected' || 
              connection.iceConnectionState === 'disconnected' ||
              connection.iceConnectionState === 'failed')) {
            console.log(`Avatar: ICE connection state: ${connection.iceConnectionState}`);
          }
        };

        await startSession(sessionData.session_id, localDescription);

        updateStatus('Avatar ready');
      } catch (error) {
        if (!isMounted) return;
        
        // Simple error handling
        updateStatus('Error initializing avatar');
        console.error('Avatar initialization error:', error.message);
        setRetryCount(prev => prev + 1);
        
        // Mark initialization as failed if this was our last retry
        if (retryCount >= 1) {
          setInitializationFailed(true);
        }
        
        // Reset session state
        setPeerConnection(null);
        setSessionInfo(null);
      }
    };
    
    if (isActive) {
      setupSession();
    }

    return () => {
      isMounted = false;
      
      // Only attempt cleanup if we have a session and haven't already tried to clean up
      if (sessionInfo && sessionInfo.session_id && !cleanupAttemptedRef.current) {
        const sessionId = sessionInfo.session_id;
        console.log(`Avatar component unmounting, cleaning up resources for session ${sessionId}...`);
        cleanupSession(sessionId).catch(err => 
          console.error(`Error during session ${sessionId} cleanup:`, err.message));
      }
    };
  }, [isActive, sessionInfo, peerConnection, retryCount, initializationFailed, isClosingSession, cleanupSession]);

  // Simplified effect for handling text to speak changes
  useEffect(() => {
    // Only speak if we have text, a valid session, and the component is active
    if (textToSpeak && sessionInfo && sessionInfo.session_id && isActive && !isClosingSession) {
      const trimmedText = textToSpeak.trim();
      
      // Check if this is the same text we just processed (to avoid duplicates in StrictMode)
      if (trimmedText && trimmedText !== previousTextRef.current) {
        previousTextRef.current = trimmedText;
        
        // Just speak the message - no welcome message handling
        speakMessage(trimmedText);
      }
    }
  }, [textToSpeak, sessionInfo, isActive, isClosingSession, speakMessage]);

  // Simple video element setup - no auto welcome message
  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (!mediaElement) return;
    
    // Simple handler just updates the state
    mediaElement.onloadedmetadata = () => {
      setMediaCanPlay(true);
    };
    
    return () => {
      mediaElement.onloadedmetadata = null;
      if (mediaElement.srcObject) {
        try {
          const tracks = mediaElement.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          mediaElement.srcObject = null;
        } catch (e) {
          // Ignore errors during cleanup
          console.warn('Avatar: Error during media cleanup:', e.message);
        }
      }
    };
  }, [renderID]);

  // Effect to handle volume changes
  useEffect(() => {
    if (mediaElementRef.current) {
      mediaElementRef.current.volume = volume;
    }
  }, [volume, mediaCanPlay]);

  // Prepare UI states
  const isInitializing = !sessionInfo && isActive && !initializationFailed;
  const showFallbackUI = initializationFailed;
  
  // If not active, render nothing
  if (!isActive) {
    return null;
  }
  
  // Fallback UI when avatar can't be initialized
  if (showFallbackUI) {
    return (
      <div className="Avatar-component">
        <div className="avatar-container">
          <div style={{ 
            position: 'relative',
            marginTop: '13%',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '90%',
            minWidth: '230px',
            maxHeight: '90%',
            minHeight: '400px',
            color: 'white',
            padding: '15px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #244D52, #1A3A3F, #0F2426)',
            borderRadius: '8px',
            alignSelf: 'center',
          }}>
            <div style={{ 
              backgroundColor: '#53C1DE', 
              borderRadius: '50%', 
              minWidth: '70px', 
              minHeight: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              fontSize: '30px'
            }}>
              <img src='/tea-logo.png' style={{width: '40px', height: '60px'}}/>
            </div>
            <h3 style={{ marginBottom: '8px', color:'snow', fontSize: '16px', whiteSpace: 'nowrap' }}>Vega has gone on a tea break.</h3>
            <p style={{ marginBottom: '10px', opacity: 0.8, fontSize: '14px', color:'snow' }}>
              Please chat with the copilot <br/> for assistance. <br/> (You can still use the mic to talk)
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Very simple avatar UI with video - no frills
  return (
    <div className="Avatar-component" style={{ top: '10px'}}>
      <div className="avatar-container">
        {/* Video container */}
        <div className="avatar-video-container">
          {/* Loading overlay */}
          <div className={`avatar-loading ${!isInitializing ? 'hidden' : ''}`} style={{ alignSelf: 'center', minHeight: '300px', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}>
            <div className="avatar-spinner"></div>
            <div style={{color: 'snow'}}>Initializing Avatar...</div>
          </div>

          {/* Video element */}
          <video 
            key={`video-${renderID}`}
            ref={mediaElementRef} 
            style={{ 
              width: '100%',
              height: '100%',
              // maxHeight: '650px',
              objectFit: 'contain',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              opacity: mediaCanPlay ? 1 : 0
            }}
            autoPlay 
            playsInline
            muted={false}
            onCanPlay={() => setMediaCanPlay(true)}
          />
          
          {!mediaCanPlay && !isInitializing && (
            <div className="avatar-loading">
              <div className="avatar-spinner"></div>
              <div>Connecting to avatar...</div>
            </div>
          )}
        </div>
        
        {/* Controls panel - below the video */}
        {mediaCanPlay && (
          <div className="avatar-controls">
            {/* Volume control */}
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
            
            {/* Interrupt button */}
            <button
              className="avatar-interrupt-button"
              onClick={interruptSpeech}
              disabled={!sessionInfo?.session_id || isInterrupting || isClosingSession}
            >
              {isInterrupting ? '...' : 'Stop'}
            </button>
          </div>
        )}
      </div>
    </div>
  );  

  // HeyGen API methods with improved error handling
  async function newSession(quality, avatar_name) {
    try {
      console.log('Avatar: Creating new session');

      // Await API configuration before proceeding
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        throw new Error('Failed to configure API');
      }

      // Create request body with required parameters
      // const requestBody = { quality, avatar_name, activity_idle_timeout: 10 };
      const requestBody = { quality, avatar_name };
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      // Handle error response
      if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        
        // Clone the response before reading the body to avoid stream already read error
        const clonedResponse = response.clone();
        
        try {
          // Try to parse error as JSON first
          const errorData = await clonedResponse.json();
          
          // Check for concurrent limit error specifically
          if (errorData?.code === 10007 || 
              (errorData?.message && errorData.message.includes('Concurrent limit'))) {
            errorMsg = 'Concurrent session limit reached';
          } else if (errorData?.message) {
            errorMsg = errorData.message;
          }
        } catch (jsonError) {
          // If JSON parsing fails, just use the status code
          console.error('Failed to parse error response:', jsonError);
        }
        
        throw new Error(errorMsg);
      }

      // Parse successful response
      const data = await response.json();
      if (!data || !data.data) {
        throw new Error('Invalid response structure');
      }

      console.log(`Avatar: Session created with ID ${data.data.session_id}`);
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  async function startSession(session_id, sdp) {
    try {
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        throw new Error('Failed to configure API');
      }
      
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify({ session_id, sdp }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status}`);
      } 
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  async function handleICE(session_id, candidate) {
    try {
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        return null; // Silent failure for ICE candidates
      }
      
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.ice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify({ session_id, candidate }),
      });
      
      if (!response.ok) {
        // ICE errors are not critical, but we should log them
        return null;
      } 
      
      const data = await response.json();
      return data;
    } catch (error) {
      // Fail silently for ICE errors as they're not critical
      return null;
    }
  }

  async function repeat(session_id, text) {
    try {
      if (!session_id || !text) {
        return null;
      }
      
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        throw new Error('Failed to configure API');
      }
      
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify({ session_id, text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send text: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  async function stopSession(session_id) {
    if (!session_id) {
      return { success: false, error: 'No session ID provided' };
    }
    
    try {
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        return { success: false, error: 'Failed to configure API' };
      }
      
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify({ session_id }),
      });
      
      // Even if the response is not ok, we consider the session closed
      if (!response.ok) {
        return { success: false, message: 'Server reported an error, but session is considered closed' };
      } 
      
      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      // Even with errors, we consider the session closed since there's not much we can do
      return { success: false, error: error.message };
    }
  }

  async function interruptSpeech() {
    if (!sessionInfo?.session_id || isClosingSession) {
      console.log('Avatar: No active session to interrupt');
      return;
    }
    
    setIsInterrupting(true);
    updateStatus('Interrupting avatar...');
    
    try {
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        throw new Error('Failed to configure API');
      }
      
      // Send interrupt command to the API
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.interrupt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
        body: JSON.stringify({ session_id: sessionInfo.session_id }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to interrupt speech: ${response.status}`);
      }
      
      console.log('Avatar: Speech interrupted successfully');
      updateStatus('Avatar ready');
    } catch (error) {
      console.error('Avatar: Error interrupting speech:', error.message);
      updateStatus('Failed to interrupt speech');
    } finally {
      setIsInterrupting(false);
    }
  }

  async function listSessions() {
    try {
      // Ensure API is configured
      const apiConfigured = await getAPI();
      if (!apiConfigured) {
        throw new Error('Failed to configure API');
      }
      
      const response = await fetch(`${heygen_API.serverUrl}/v1/streaming.list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygen_API.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Avatar: Error listing sessions:', error.message);
      return [];
    }
  }
}

export default Avatar;