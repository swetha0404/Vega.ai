import React, { useState, useRef } from 'react';
import { BiReset } from "react-icons/bi";
import { FaMicrophone, FaStop } from "react-icons/fa";
import '../components/voiceToTextLayout.css';

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
    <div className="voice-to-text-container">
      <h3 className="voice-to-text-title">Talk with Vega</h3>
      <div className="chat-icon-buttons voice-to-text-buttons">
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
      <p className="voice-to-text-mic-status">
        Microphone: {recording ? <span style={{ color: "#53C1DE" }}>on</span> : <span style={{ color: "gray" }}>off</span>}
      </p>
      {error && (
        <div className="voice-to-text-error">{error}</div>
      )}
      {/* <p>Transcript: {transcript}</p> */}
    </div>
  );
};

export default VoiceToText;