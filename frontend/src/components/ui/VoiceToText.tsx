import React, { useState, useRef } from 'react';
import { Mic, Square, RotateCcw } from 'lucide-react';
import { Button } from './button-variants';

// Extend Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceToTextProps {
  onTranscript: (text: string) => void;
  isRecording?: boolean;
  onRecordingChange?: (recording: boolean) => void;
}

const VoiceToText: React.FC<VoiceToTextProps> = ({ 
  onTranscript, 
  isRecording: externalRecording, 
  onRecordingChange 
}) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Use external recording state if provided, otherwise use internal state
  const currentlyRecording = externalRecording !== undefined ? externalRecording : recording;

  // Update internal recording state when external state changes
  React.useEffect(() => {
    if (externalRecording !== undefined && externalRecording !== recording) {
      setRecording(externalRecording);
    }
  }, [externalRecording, recording]);

  const updateRecordingState = (newRecording: boolean) => {
    setRecording(newRecording);
    if (onRecordingChange) {
      onRecordingChange(newRecording);
    }
  };

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
    recognition.interimResults = true; // Show interim results for better UX
    recognition.continuous = false;

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
      
      // Show interim results while speaking
      setTranscript(finalTranscript + interimTranscript);
      
      // Only send final transcript
      if (finalTranscript) {
        console.log("VoiceToText: Final transcript received:", finalTranscript);
        if (onTranscript) onTranscript(finalTranscript);
        updateRecordingState(false);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("VoiceToText: Speech recognition error:", event.error);
      setError("Speech recognition error: " + event.error);
      updateRecordingState(false);
    };
    
    recognition.onend = () => {
      console.log("VoiceToText: Speech recognition ended");
      updateRecordingState(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    updateRecordingState(true);
    console.log("VoiceToText: Speech recognition started");
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      updateRecordingState(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError('');
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
      <div className="text-center">
        <h3 className="text-sm font-medium mb-2">Talk with Vega</h3>
        <div className="flex justify-center gap-2">
          <Button
            variant={currentlyRecording ? "destructive" : "outline"}
            size="icon"
            onClick={startListening}
            disabled={currentlyRecording || !isSupported}
            title="Start Listening"
            className={currentlyRecording ? "bg-destructive text-destructive-foreground" : ""}
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={stopListening}
            disabled={!currentlyRecording}
            title="Stop Listening"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetTranscript}
            disabled={currentlyRecording}
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Microphone: {currentlyRecording ? (
            <span className="text-red-500 font-medium">recording</span>
          ) : (
            <span className="text-gray-500">off</span>
          )}
        </p>
      </div>
      
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border">
          {error}
        </div>
      )}
      
      {/* Show live transcript while recording */}
      {currentlyRecording && transcript && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
          <span className="font-medium">Listening:</span> {transcript}
        </div>
      )}
    </div>
  );
};

export default VoiceToText;
