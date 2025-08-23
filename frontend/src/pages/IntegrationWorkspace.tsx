import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Square, 
  Mic, 
  Send,
  Coffee,
  ArrowLeft,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import ChatSuggestions from "@/components/ui/ChatSuggestions"
import VoiceToText from "@/components/ui/VoiceToText"
import { auth } from "@/utils/auth"
import { api } from "@/utils/api"

// Extend Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string
  content: string
  sender: "user" | "vega"
  timestamp: Date
  type?: "text" | "speech"
}

export default function IntegrationWorkspace() {
  const { app } = useParams()
  const navigate = useNavigate()
  const API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8000"
  
  // Check authentication on component mount
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate('/');
      return;
    }
  }, [navigate]);

  // Basic state
  const [avatarActive, setAvatarActive] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputPlaceholder, setInputPlaceholder] = useState('Type your message...')
  const [conversationStarted, setConversationStarted] = useState(false)
  const [avatarTextToSpeak, setAvatarTextToSpeak] = useState('')
  const [autoSendPending, setAutoSendPending] = useState(false)
  
  // Heygen Avatar State
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [mediaCanPlay, setMediaCanPlay] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [initializationFailed, setInitializationFailed] = useState(false)
  const [userStoppedManually, setUserStoppedManually] = useState(false)
  const [isInterrupting, setIsInterrupting] = useState(false)
  
  // Heygen Avatar Refs
  const mediaElementRef = useRef<HTMLVideoElement>(null)
  const canvasElementRef = useRef<HTMLCanvasElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const renderIdRef = useRef(0)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const apiPromiseRef = useRef<Promise<boolean> | null>(null)
  const previousTextRef = useRef('')
  const isStartingSessionRef = useRef(false)
  const dismountTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Default avatar and voice configuration
  const defaultAvatarId = 'Alessandra_ProfessionalLook2_public'
  const defaultVoiceId = null // Use null to let avatar use its default voice
  
  // API configuration
  const heygen_API = useRef({
    apiKey: '',
    serverUrl: 'https://api.heygen.com',
    isConfigured: false
  })
  
  // Background image for avatar
  const defaultBackground = 'linear-gradient(135deg, #1e3a8a, #3b82f6, #60a5fa)'
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hello! I'm your AI Copilot for ${app?.replace('-', ' ')}. Ask me questions, get help, or receive step-by-step guidance.`,
      sender: "vega",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  const integrationNames: { [key: string]: string } = {
    "google-workspace": "Google Workspace",
    "salesforce": "Salesforce",
    "microsoft-365": "Microsoft 365",
    "slack": "Slack",
    "jira": "Jira",
    "confluence": "Confluence"
  }

  // Chat History Management Functions - using IntegrationWorkspace-specific key
  const getChatHistory = () => {
    const stored = sessionStorage.getItem(`IntegrationWorkspace_${app}_History`);
    return stored ? JSON.parse(stored) : {};
  };

  const updateChatHistory = (key: string, message: string) => {
    const chatHistory = getChatHistory();
    chatHistory[key] = message;
    sessionStorage.setItem(`IntegrationWorkspace_${app}_History`, JSON.stringify(chatHistory));
  };

  const clearChatHistory = () => {
    sessionStorage.removeItem(`IntegrationWorkspace_${app}_History`);
  };

  // ==================== HEYGEN AVATAR FUNCTIONS ====================
  
  const updateStatus = (message: string) => {
    console.log(`Avatar: ${message}`);
  };

  const getAPI = async (): Promise<boolean> => {
    // If already configured, return immediately
    if (heygen_API.current.isConfigured) {
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
        heygen_API.current.apiKey = data.apiKey;
        if (data.url) {
          heygen_API.current.serverUrl = data.url;
        }
        
        heygen_API.current.isConfigured = true;
        
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

  const onMessage = (event: MessageEvent) => {
    // Silently handle data channel messages - no need to log them
  };

  const newSession = async (quality: string, avatar_name: string, voice_id: string | null) => {
    // Build the request body - only include voice if voice_id is provided
    const requestBody: any = {
      quality,
      avatar_name,
      idle_timeout: 420, // 7 minutes = 420 seconds
    };

    // Only add voice configuration if voice_id is provided
    if (voice_id) {
      requestBody.voice = {
        voice_id: voice_id,
      };
    }

    console.log('Creating session with payload:', requestBody);

    const response = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.current.apiKey,
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

  const startStreamingSession = async (session_id: string, sdp: RTCSessionDescriptionInit) => {
    const response = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.current.apiKey,
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

  const handleICE = async (session_id: string, candidate: RTCIceCandidateInit) => {
    const response = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.ice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.current.apiKey,
      },
      body: JSON.stringify({ session_id, candidate }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('handleICE error:', response.status, errorText);
      throw new Error(`ICE error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  };

  const repeat = async (session_id: string, text: string) => {
    const response = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.current.apiKey,
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

  const terminateSession = async (session_id: string) => {
    const response = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': heygen_API.current.apiKey,
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

    // Generate unique ID to track this specific render process
    const curRenderID = Math.trunc(Math.random() * 1000000000);
    renderIdRef.current = curRenderID;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

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

  const isCloseToGreen = (color: number[]) => {
    const [red, green, blue] = color;
    return green > 90 && red < 90 && blue < 90;
  };

  const speakMessage = useCallback(async (message: string) => {
    if (!sessionInfo?.session_id || !isSessionActive) {
      return;
    }
    
    // Ensure API is configured before speaking
    const apiConfigured = await getAPI();
    if (!apiConfigured || !heygen_API.current.apiKey) {
      console.log('Avatar: Cannot speak - API not configured');
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
    } catch (error: any) {
      console.error(`Avatar: Speaking error:`, error.message);
      updateStatus('Communication issue - please continue with text');
    }
  }, [sessionInfo, isSessionActive]);

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
        const interruptResponse = await fetch(`${heygen_API.current.serverUrl}/v1/streaming.interrupt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': heygen_API.current.apiKey,
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
      const interruptionMethods = [' ', '.', 'stop'];

      let success = false;
      
      for (const method of interruptionMethods) {
        try {
          await repeat(sessionInfo.session_id, method);
          success = true;
          updateStatus(`Avatar interrupted successfully (using text: "${method}")`);
          break;
        } catch (error: any) {
          console.log(`Interrupt method "${method}" failed:`, error.message);
          continue;
        }
      }

      if (success) {
        updateStatus('Avatar interrupted successfully');
      } else {
        updateStatus('Failed to interrupt avatar - all methods failed');
      }
    } catch (error: any) {
      console.error('Error interrupting avatar:', error);
      updateStatus('Error interrupting avatar: ' + error.message);
    } finally {
      setIsInterrupting(false);
    }
  };

  const startSession = async () => {
    // Prevent multiple simultaneous session starts
    if (isStartingSessionRef.current) {
      console.log('Avatar: Session start already in progress, skipping');
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

      updateStatus(`Creating new session with avatar: ${defaultAvatarId}`);

      // Create session with default avatar and voice
      const sessionData = await newSession('low', defaultAvatarId, defaultVoiceId);
      
      if (!sessionData) {
        throw new Error('Failed to create session - no data returned');
      }

      setSessionInfo(sessionData);
      
      // Store session ID and timestamp in sessionStorage
      sessionStorage.setItem('avatarSessionId', sessionData.session_id);
      sessionStorage.setItem('avatarSessionTimestamp', Date.now().toString());
      
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
        updateStatus(`ICE connection state: ${peerConnectionRef.current?.iceConnectionState}`);
      };

      // Start the streaming session with HeyGen
      updateStatus('Starting streaming session...');
      await startStreamingSession(sessionData.session_id, localDescription);

      // Configure media receivers to adjust buffer size for smoother playback
      const receivers = peerConnectionRef.current.getReceivers();
      receivers.forEach((receiver) => {
        if ('jitterBufferTarget' in receiver) {
          (receiver as any).jitterBufferTarget = 500; // Set buffer to 500ms to reduce stuttering
        }
      });

      setIsSessionActive(true);
      updateStatus('🎉 Session started successfully! You can now send messages to the avatar.');
      
      // Send starter message as soon as avatar initializes
      setTimeout(() => {
        setAvatarTextToSpeak('Hello there!');
      }, 1000); // Small delay to ensure avatar is fully ready
    } catch (error: any) {
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

  const stopSessionAutomatic = async () => {
    if (!sessionInfo) {
      return;
    }

    updateStatus('Stopping session... please wait');
    
    // Don't set manual stop flag for automatic stops
    await terminateSessionInternal();
  };

  const restartSession = async () => {
    setUserStoppedManually(false);
    setInitializationFailed(false); // Also reset initialization failure
    // The useEffect will automatically start the session when userStoppedManually becomes false
  };

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
      
      // Remove session from sessionStorage
      sessionStorage.removeItem('avatarSessionId');
      sessionStorage.removeItem('avatarSessionTimestamp');
      
      // Reset state
      setSessionInfo(null);
      setIsSessionActive(false);
      setMediaCanPlay(false);
      renderIdRef.current++;
      isStartingSessionRef.current = false; // Reset session starting flag
      previousTextRef.current = ''; // Clear previous text
      
      updateStatus('Session stopped successfully');
    } catch (error: any) {
      console.error('Failed to stop the session:', error);
      updateStatus('Error stopping session: ' + error.message);
    }
  };

  // ==================== END HEYGEN AVATAR FUNCTIONS ====================

  // Clear chat history
  const clearChat = () => {
    setMessages([
      {
        id: "1",
        content: `Hello! I'm your AI Copilot for ${app?.replace('-', ' ')}. Ask me questions, get help, or receive step-by-step guidance.`,
        sender: "vega",
        timestamp: new Date()
      }
    ]);
    setConversationStarted(false);
    setShowSuggestions(false);
    setInputPlaceholder('Type your message...');
    clearChatHistory();
  };

  const handleStartAvatar = () => {
    setAvatarActive(true)
    setUserStoppedManually(false);
    setInitializationFailed(false);
  }

  const handleStopAvatar = () => {
    stopSession(); // Use the Heygen stop session function
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (!muted && mediaElementRef.current && mediaCanPlay) {
      mediaElementRef.current.volume = newVolume;
    }
  }

  const handleMuteToggle = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (mediaElementRef.current && mediaCanPlay) {
      mediaElementRef.current.volume = newMuted ? 0 : volume;
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Mark conversation as started when first message is sent
    if (!conversationStarted) {
      setConversationStarted(true);
      // Reset placeholder to default when conversation starts
      setInputPlaceholder('Type your message...');
    }

    // Add user message to chat
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: userMessage,
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Add placeholder avatar messages while processing
    const placeholderMessages = [
      "Hmm, let me think about that...",
      "Uh huh, I am processing your request...",
      "Give me a moment to analyze this...",
      "Working on your query...",
      "Let me check that for you..."
    ];
    
    const randomPlaceholder = placeholderMessages[Math.floor(Math.random() * placeholderMessages.length)];
    
    // Send placeholder message to avatar to speak
    setAvatarTextToSpeak(randomPlaceholder);

    try {
      // Get current chat history from sessionStorage (previous messages only)
      const storedChatHistory = getChatHistory();
      
      // Log current chat history for debugging
      console.log('IntegrationWorkspace - Chat History being sent to backend:', storedChatHistory);

      const response = await api.fetchWithAuth('/Agentchat', {
        method: 'POST',
        body: JSON.stringify({
          question: userMessage,
          history: storedChatHistory // Send Chat_History object directly
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const botResponse = result.response || 'Sorry, I couldn\'t generate a response.';
      const avatarText = result.avatarText || botResponse;
      
      // After getting response, add BOTH user message and AI response to chat history
      const chatHistory = getChatHistory();
      
      // Count existing user messages to get the next message number
      const userMessageCount = Object.keys(chatHistory).filter(key => key.startsWith('User_message_')).length;
      const nextMessageNumber = userMessageCount + 1;
      
      const userKey = `User_message_${nextMessageNumber}`;
      const aiKey = `AI_message_${nextMessageNumber}`;
      
      updateChatHistory(userKey, userMessage);
      updateChatHistory(aiKey, botResponse);
      
      // Add bot response to chat
      const newBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "vega",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newBotMessage]);

      // Send the avatar-specific text to the avatar to speak
      setAvatarTextToSpeak(avatarText);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = 'Sorry, I encountered an error while processing your question. Please try again.';
      const avatarErrorMessage = 'I encountered an error while processing your question. Please try again.';
      
      const errorBotMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: errorMessage,
        sender: "vega",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorBotMessage]);
      
      // Send the avatar-specific error message
      setAvatarTextToSpeak(avatarErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function for handling voice transcript - no auto-send, just update input
  const handleVoiceTranscript = (text: string) => {
    // Simply set the transcript in the input field - no auto-send
    setInputMessage(text);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    setInputPlaceholder('Type your message...'); // Reset placeholder to default
    setShowSuggestions(false); // Hide dropdown suggestions
    
    // Don't mark the conversation as started yet - only when message is sent
    // This allows the user to still see different suggestions if they don't send the selected one
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleMicToggle = () => {
    if (!recording) {
      // Start voice recognition
      startVoiceRecognition();
    } else {
      // Stop voice recognition
      stopVoiceRecognition();
    }
  };

  const startVoiceRecognition = () => {
    const isSupported = !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
    
    if (!isSupported) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true; // Show interim results for better UX
    recognition.continuous = false; // Let it stop automatically, but allow manual restart

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }
      
      // Update input field with both final and interim results
      const fullTranscript = finalTranscript + interimTranscript;
      setInputMessage(fullTranscript);
      
      console.log("Main mic: Transcript update:", fullTranscript);
      
      // If we got a final transcript, keep the recognition running unless manually stopped
      if (finalTranscript && recognitionRef.current) {
        // Restart recognition to continue listening for more speech
        setTimeout(() => {
          if (recognitionRef.current && recording) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log("Recognition restart failed, probably already running");
            }
          }
        }, 100);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("Main mic: Speech recognition error:", event.error);
      // Only stop recording on certain errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setRecording(false);
        recognitionRef.current = null;
      } else {
        // For other errors, try to restart if still recording
        setTimeout(() => {
          if (recording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log("Recognition restart after error failed");
              setRecording(false);
              recognitionRef.current = null;
            }
          }
        }, 500);
      }
    };
    
    recognition.onend = () => {
      console.log("Main mic: Speech recognition ended");
      // Only stop if manually stopped, otherwise restart
      if (recording && recognitionRef.current) {
        setTimeout(() => {
          if (recording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log("Recognition restart failed, stopping");
              setRecording(false);
              recognitionRef.current = null;
            }
          }
        }, 100);
      } else {
        setRecording(false);
      }
    };

    // Store recognition instance for manual stopping
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    console.log("Main mic: Speech recognition started");
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
    console.log("Main mic: Speech recognition manually stopped");
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Effect to clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      // Also cleanup recognition if still running
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      // Cleanup avatar dismount timeout
      if (dismountTimeoutRef.current) {
        console.log('Avatar: Component unmounting, clearing dismount timeout');
        clearTimeout(dismountTimeoutRef.current);
        dismountTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Effect to manage avatar session lifecycle
  useEffect(() => {
    console.log('IntegrationWorkspace: Activating avatar...');
    setAvatarActive(true);
    
    return () => {
      console.log('IntegrationWorkspace: Unmounting - deactivating avatar...');
      setAvatarActive(false);
      
      // Log after a short delay to confirm state change propagation
      setTimeout(() => {
        console.log('IntegrationWorkspace: Avatar deactivation complete, session should be closing...');
      }, 100);
    };
  }, []);

  // Heygen Avatar Effects

  // Effect for handling text to speak changes
  useEffect(() => {
    // Only speak if we have text, a valid session, and the component is active
    if (avatarTextToSpeak && sessionInfo && sessionInfo.session_id && avatarActive && isSessionActive) {
      const trimmedText = avatarTextToSpeak.trim();
      
      // Check if this is the same text we just processed (to avoid duplicates)
      if (trimmedText && trimmedText !== previousTextRef.current) {
        previousTextRef.current = trimmedText;
        
        // Just speak the message
        speakMessage(trimmedText).catch(error => {
          console.error('Avatar: Error in speakMessage:', error);
        });
      }
    }
  }, [avatarTextToSpeak, sessionInfo, avatarActive, isSessionActive, speakMessage]);

  // Effect to manage avatar session lifecycle
  useEffect(() => {
    if (avatarActive && !isSessionActive && !isStartingSessionRef.current && !userStoppedManually) {
      // Clear any pending dismount timeout when component becomes active
      if (dismountTimeoutRef.current) {
        console.log('Avatar: Clearing dismount timeout - component reactivated');
        clearTimeout(dismountTimeoutRef.current);
        dismountTimeoutRef.current = null;
      }
      // Auto-start session when component becomes active (only if user hasn't manually stopped)
      startSession();
    } else if (!avatarActive && isSessionActive) {
      // Start delayed cleanup when component becomes inactive
      console.log('Avatar: Component deactivated, starting 10-second cleanup timer');
      dismountTimeoutRef.current = setTimeout(() => {
        // Double-check if component is still inactive and session is still active
        console.log('Avatar: Checking session cleanup after 10 seconds...');
        
        // Check current state and sessionStorage
        const currentSessionId = sessionStorage.getItem('avatarSessionId');
        if (!avatarActive && isSessionActive && currentSessionId) {
          console.log('Avatar: 10 seconds elapsed, component still inactive, closing session');
          stopSessionAutomatic();
        } else {
          console.log('Avatar: Session state changed during timeout, skipping cleanup');
        }
        dismountTimeoutRef.current = null;
      }, 10000); // 10 seconds delay
    }
  }, [avatarActive, isSessionActive, userStoppedManually]);

  // Effect to reset manual stop flag when component becomes inactive then active again
  useEffect(() => {
    if (!avatarActive) {
      // Reset manual stop flag when component becomes inactive
      // This allows the session to restart when component becomes active again
      setUserStoppedManually(false);
    }
  }, [avatarActive]);

  // Effect to handle volume changes for Heygen avatar
  useEffect(() => {
    if (mediaElementRef.current && mediaCanPlay) {
      mediaElementRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, mediaCanPlay, muted]);

  // Effect to start background removal when video loads
  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (mediaElement) {
      const handleLoadedMetadata = async () => {
        setMediaCanPlay(true);
        try {
          await mediaElement.play();
          // Start background removal immediately after successful play
          renderCanvas();
        } catch (error: any) {
          if (error.name === 'NotAllowedError') {
            console.log('Avatar: Autoplay blocked by browser, waiting for user interaction');
            // Set up click handler to enable playback on user interaction
            const enablePlayback = async () => {
              try {
                await mediaElement.play();
                renderCanvas();
                // Remove the event listener after successful play
                document.removeEventListener('click', enablePlayback);
                document.removeEventListener('keydown', enablePlayback);
                console.log('Avatar: Playback enabled after user interaction');
              } catch (playError) {
                console.log('Avatar: Still unable to play media:', playError);
              }
            };
            
            // Listen for any user interaction to enable playback
            document.addEventListener('click', enablePlayback, { once: true });
            document.addEventListener('keydown', enablePlayback, { once: true });
          } else {
            console.error('Avatar: Media play error:', error);
          }
        }
      };

      const handleCanPlay = async () => {
        setMediaCanPlay(true);
        // Try to start playback if not already playing
        if (mediaElement.paused) {
          try {
            await mediaElement.play();
            renderCanvas();
          } catch (error: any) {
            if (error.name === 'NotAllowedError') {
              console.log('Avatar: Autoplay blocked in handleCanPlay, media will play after user interaction');
            } else {
              console.error('Avatar: handleCanPlay error:', error);
            }
          }
        } else {
          // Already playing, just trigger canvas rendering
          renderCanvas();
        }
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

  return (
    <div className="h-screen flex bg-background">
      {/* Avatar Panel */}
      <div className="w-1/3 border-r border-border bg-card flex flex-col">
        <Card className="flex-1 rounded-none border-0 flex flex-col">
          <CardHeader className="border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Vega Assistant
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {integrationNames[app || ""] || "Integration"}
                </p>
              </div>
                <Badge variant="secondary" className="bg-success/10 text-success">
                <div className="w-2 h-2 bg-success rounded-full mr-2" />
                Connected
              </Badge>
            </div>
          </CardHeader>
          
          {/* Avatar Display - Takes up remaining space */}
          <CardContent className="flex-1 flex items-center justify-center p-6">
            {avatarActive ? (
              <div className="relative">
                <div 
                  className="w-74 h-74 bg-neural rounded-full flex items-center justify-center shadow-neural-intense overflow-hidden"
                  style={{
                    background: defaultBackground,
                    width: '296px',
                    height: '296px'
                  }}
                >
                  {/* Heygen Video Elements */}
                  <video
                    ref={mediaElementRef}
                    autoPlay
                    playsInline
                    style={{ display: 'none' }}
                  />
                  
                  {/* Heygen Canvas for Avatar with Green Screen Removal */}
                  {isSessionActive && !initializationFailed ? (
                    <canvas
                      ref={canvasElementRef}
                      className="avatar-canvas"
                      width={400}
                      height={600}
                      style={{ 
                        display: 'block',
                        width: '276px',
                        height: '276px',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        borderRadius: '50%',
                        backgroundColor: 'transparent',
                        transform: 'translateY(30px)' // Move avatar down more to show face
                      }}
                    />
                  ) : userStoppedManually ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Coffee className="w-20 h-20 text-muted-foreground mb-4" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Vega has gone for tea
                      </span>
                    </div>
                  ) : initializationFailed ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Unable to connect
                      </span>
                    </div>
                  ) : (
                    <Avatar className="w-56 h-56">
                      <AvatarFallback className="text-5xl font-bold bg-primary text-primary-foreground">
                        V
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Loading overlay for Heygen initialization */}
                  {(!isSessionActive && avatarActive && !initializationFailed && !userStoppedManually) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full text-white">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-sm">Initializing...</span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full border">
                    <div className={`w-2 h-2 rounded-full ${
                      recording ? 'bg-red-500 animate-pulse' : 
                      isSessionActive ? 'bg-success' : 
                      userStoppedManually ? 'bg-orange-500' :
                      initializationFailed ? 'bg-destructive' : 'bg-yellow-500'
                    }`} />
                    <span className="text-xs font-medium">
                      {recording ? 'Listening' : 
                       isSessionActive ? 'Speaking' :
                       userStoppedManually ? 'On tea break' :
                       initializationFailed ? 'Disconnected' : 'Connecting'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center animate-fade-in">
                <div 
                  className="bg-muted/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-border"
                  style={{
                    width: '296px',
                    height: '296px'
                  }}
                >
                  {initializationFailed ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                        <span className="text-3xl">⚠️</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Unable to connect
                      </span>
                    </div>
                  ) : (
                    <Coffee className="w-20 h-20 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {initializationFailed ? "Vega is unable to connect" : "Vega has gone for tea"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {initializationFailed 
                    ? "You can still chat with us for assistance" 
                    : "Press Start to call her again"
                  }
                </p>
                <Button variant="neural" onClick={handleStartAvatar}>
                  <Play className="w-4 h-4 mr-2" />
                  {initializationFailed ? "Try Again" : "Start Session"}
                </Button>
              </div>
            )}
          </CardContent>

          {/* Avatar Controls - Fixed at bottom */}
          {avatarActive && (
            <div className="flex-shrink-0 p-6 pt-0 space-y-4 animate-slide-in">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={handleMuteToggle}>
                  {muted ? <VolumeX /> : <Volume2 />}
                </Button>
                
                {isSessionActive ? (
                  <Button variant="destructive" size="icon" onClick={handleStopAvatar}>
                    <Square />
                  </Button>
                ) : (
                  <Button variant="neural" size="icon" onClick={handleStartAvatar}>
                    <Play />
                  </Button>
                )}
                
                {/* Show Interrupt button only when Heygen session is active */}
                {isSessionActive && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={interruptHandler}
                    disabled={isInterrupting}
                  >
                    {isInterrupting ? 'Interrupting...' : 'Interrupt'}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-muted-foreground" />
                <div 
                  className="flex-1 h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const width = rect.width;
                    const newVolume = Math.max(0, Math.min(1, x / width));
                    handleVolumeChange(newVolume);
                  }}
                >
                  <div 
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Voice to Text Component */}
              <VoiceToText 
                onTranscript={handleVoiceTranscript}
                isRecording={recording}
                onRecordingChange={setRecording}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Chat Panel */}
      <div className="w-2/3 flex flex-col">
        {/* Header with back button and clear chat */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/integrations')}
                title="Back to Integrations"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold">Neural Chat</h2>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your {integrationNames[app || ""]} integration
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={clearChat}
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Chat
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div className={`max-w-[80%] ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                } rounded-lg px-4 py-2`}>
                  {message.sender === "vega" ? (
                    <div className="text-sm prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                      <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="relative">
            {/* Only show suggestions if conversation hasn't started */}
            {!conversationStarted && (
              <ChatSuggestions
                onSelectSuggestion={handleSelectSuggestion}
                showSuggestions={showSuggestions}
                updatePlaceholder={setInputPlaceholder}
                conversationStarted={conversationStarted}
              />
            )}
            <div className="flex gap-2">
              <Button
                variant={recording ? "destructive" : "outline"}
                size="icon"
                onClick={handleMicToggle}
                className={recording ? "bg-destructive text-destructive-foreground" : ""}
              >
                <Mic />
              </Button>
              
              <div className="flex-1 flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={conversationStarted ? 'Type your message...' : inputPlaceholder}
                  value={inputMessage}
                  onChange={(e) => {
                    // Update the input value
                    setInputMessage(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    // Send message on Enter key
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  onFocus={() => !conversationStarted && setShowSuggestions(true)}
                  onBlur={() => {
                    // Small delay to allow for suggestion clicks
                    setTimeout(() => {
                      if (!conversationStarted) {
                        setShowSuggestions(false);
                      }
                    }, 150);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  variant="neural" 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? 'Sending...' : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}