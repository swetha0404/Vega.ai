import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useSpeech } from "react-text-to-speech";

function TTS() {
  const navigate = useNavigate();
  const [text, setText] = useState("This library is awesome!");
  const [loading, setLoading] = useState(false);

  const {
    Text,
    speechStatus,
    isInQueue,
    start,
    pause,
    stop,
    setText: setSpeechText, // Provided by useSpeech to update text dynamically
  } = useSpeech({ text });

  // Fetch text from backend and update for speech
  const fetchTextFromBackend = async () => {
  setLoading(true);
  try {
    const res = await fetch("http://localhost:8000/get-avatar-text");
    const data = await res.json();
    setText(data.text);
  } catch (e) {
    setText("Failed to fetch text from backend.");
  }
  setLoading(false);
};

  return (
    <div style={{ marginTop: '5%', display: "flex", flexDirection: "column", justifyContent: 'center', alignItems: 'center', rowGap: "1rem", color: 'black' }}>
      <button onClick={() => navigate('/services')} >
        Back to Applications
      </button>
      <Text />
      <div style={{ display: "flex", columnGap: "0.5rem" }}>
        {speechStatus !== "started" ? (
          <button onClick={start} disabled={loading}>Start</button>
        ) : (
          <button onClick={pause} disabled={loading}>Pause</button>
        )}
        <button onClick={stop} disabled={loading}>Stop</button>
        <button onClick={fetchTextFromBackend} disabled={loading}>
          {loading ? "Loading..." : "Get Text from Backend"}
        </button>
      </div>
    </div>
  );
}

export default TTS;