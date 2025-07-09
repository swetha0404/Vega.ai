import React, { useState, useRef } from 'react';
import { BiReset } from "react-icons/bi";
import { FaMicrophone, FaStop } from "react-icons/fa";
import '../pages/ChatPage.css';

const VoiceToText = ({ onTranscript }) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    setError('');
    setTranscript('');
    if (!isSupported) {
      setError("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (onTranscript) onTranscript(text);
      setRecording(false);
    };
    recognition.onerror = (event) => {
      setError("Speech recognition error: " + event.error);
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError('');
  };

  return (
    <div style={{ 
        color: 'black', 
        justifyContent: 'center', 
        alignItems: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '0.5rem', 
        width: '100%', 
        marginTop: '5px',
        maxWidth: '349px', // Match avatar width
        margin: '5px auto 0'
      }}>
      <h3 style={{ 
        color: 'white', 
        fontSize: '1.2rem', 
        fontWeight: '600', 
        marginBottom: '0.5rem', 
        textAlign: 'center', 
        borderBottom: '2px solid #4884c8', 
        paddingBottom: '0.4rem', 
        fontFamily: "'Orbitron', sans-serif", 
        width: '100%', 
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>Talk with Vega</h3>
      <div className="chat-icon-buttons" style={{ marginTop: '8px', gap: '12px' }}>
        <button
          className="round-button"
          onClick={startListening}
          disabled={recording || !isSupported}
          title="Start Listening"
        >
          <FaMicrophone />
        </button>
        <button
          className="round-button"
          onClick={stopListening}
          disabled={!recording}
          title="Stop Listening"
        >
          <FaStop />
        </button>
        <button
          className="round-button"
          onClick={resetTranscript}
          disabled={recording}
          title="Reset"
        >
          <BiReset />
        </button>
      </div>
      <p style={{ 
        fontFamily: 'Orbitron, sans-serif', 
        fontSize: '0.9rem', 
        margin: '8px 0 0',
        textAlign: 'center',
        color: 'white'
      }}>
        Microphone: {recording ? <span style={{ color: "lightgreen" }}>on</span> : <span style={{ color: "lightgray" }}>off</span>}
      </p>
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>{error}</div>
      )}
      {/* <p>Transcript: {transcript}</p> */}
    </div>
  );
};

export default VoiceToText;