import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { BiReset } from "react-icons/bi";
import { FaMicrophone, FaStop, FaSave } from "react-icons/fa";
import './ChatPage.css';

const VoiceToTest = ({ onTranscript }) => {

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [audioURL, setAudioURL] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isSpeechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isAudioSupported = !!(navigator.mediaDevices && window.MediaRecorder);

  const startListening = async () => {
    setError('');
    setTranscript('');
    setAudioURL(null);
    audioChunksRef.current = [];

    // Start audio recording
    if (!isAudioSupported) {
      setError("Audio recording not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.start();
    } catch (err) {
      setError("Microphone access denied or unavailable.");
      return;
    }

    // Start speech recognition
    if (!isSpeechSupported) {
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
      // Stop audio recording when speech recognition ends
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
    recognition.onerror = (event) => {
      setError("Speech recognition error: " + event.error);
      setRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
    recognition.onend = () => {
      setRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const resetAll = () => {
    setTranscript('');
    setError('');
    setAudioURL(null);
    setRecording(false);
    audioChunksRef.current = [];
  };
  const saveRecording = async () => {
  if (!audioURL || !transcript) return;
  const audioBlob = await fetch(audioURL).then(r => r.blob());
  const formData = new FormData();
  formData.append("audio_file", audioBlob, "record.wav");
  formData.append("transcript", transcript);

  try {
    const res = await fetch("http://localhost:8000/save-recording", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Saved as record${data.recording_number}.wav and record${data.recording_number}_transcript.txt`);
    } else {
      alert("Failed to save recording.");
    }
  } catch {
    alert("Could not reach backend.");
  }
  };
  const navigate = useNavigate();  
  return (
    <div style={{ color: 'black', flexDirection: 'column', display: 'flex', justifyContent: 'center', alignItems: 'center' }} >
      <div>
        <button  onClick={() => navigate('/services')}
        >
          Back
        </button>
      </div>
      <div className="chat-icon-buttons" style={{ marginTop: "50px"}}>
        <button
          className="round-button"
          onClick={startListening}
          disabled={recording || !isSpeechSupported || !isAudioSupported}
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
          onClick={resetAll}
          disabled={recording}
          title="Reset"
        >
          <BiReset />
        </button>
        <button
          className="round-button"
          onClick={saveRecording}
          disabled={!audioURL || !transcript}
          title="Save Recording"
        >
          <FaSave />
        </button>
      </div>
      <p>
        Microphone: {recording ? <span style={{ color: "green" }}>on</span> : <span style={{ color: "gray" }}>off</span>}
      </p>
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>{error}</div>
      )}
      <div style={{ marginTop: 20 }}>
        <strong>Transcript:</strong>
        <div style={{ minHeight: 24 }}>{transcript}</div>
      </div>
      <div style={{ marginTop: 20 }}>
        <strong>Recording:</strong> <br/>
        {audioURL && <audio src={audioURL} controls />}
      </div>
      
    </div>
  );
};

export default VoiceToTest;