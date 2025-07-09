import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './SettingsPage.css';
import Topbar from '../components/top_bar';
import Sidebar from '../components/sidebar';


function SettingsPage() {
  // Upload state
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadStatusType, setUploadStatusType] = useState(''); // 'success', 'error', 'duplicate', 'processing'
  const [showNotification, setShowNotification] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [selectedDocxFile, setSelectedDocxFile] = useState(null);
  const [selectedPptFile, setSelectedPptFile] = useState(null);
  const notificationTimeoutRef = useRef(null);
  
  // Chat state
  const [messages, setMessages] = useState([
    { type: 'bot', text: "Hello! I'm your knowledge base assistant. Upload PDFs or provide website URLs to help me answer your questions better." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); 
  // Function to manually dismiss notification
  const dismissNotification = () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setShowNotification(false);
    setTimeout(() => {
      setUploadStatus('');
      setUploadStatusType('');
    }, 400);
  };

  // Function to show notification with auto-dismiss
  const showUploadNotification = useCallback((message, type) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    setUploadStatus(message);
    setUploadStatusType(type);
    setShowNotification(true);

    // Auto-dismiss after 12 seconds
    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
      // Clear the status after animation completes
      setTimeout(() => {
        setUploadStatus('');
        setUploadStatusType('');
      }, 400); // Match the CSS transition duration
    }, 12000);
  }, []);

  // Function to get status icon
  const getStatusIcon = (type) => {
    switch (type) {
      case 'success': return '🎉';
      case 'duplicate': return '⚠️';
      case 'error': return '❌';
      case 'processing': return '⏳';
      default: return '';
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);
  // Handle website processing
  const handleProcessWebsite = async () => {
    if (!websiteUrl.trim()) {
      showUploadNotification('Please enter a valid website URL', 'error');
      return;
    }

    showUploadNotification('Processing website...', 'processing');
    
    try {
      const formData = new FormData();
      formData.append('url', websiteUrl);

      const response = await fetch('http://localhost:8000/process/website', {
        method: 'POST',
        body: formData
      });      const result = await response.json();
        if (result.status === 'success') {
        showUploadNotification(`Website processed successfully! Doc ID: ${result.doc_id}`, 'success');
        setWebsiteUrl(''); // Clear the input
      } else if (result.status === 'duplicate') {
        showUploadNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'duplicate');
        setWebsiteUrl(''); // Clear the input
      } else {
        showUploadNotification(`Error: ${result.message}`, 'error');
      }
    } catch (error) {
      showUploadNotification(`Error processing website: ${error.message}`, 'error');
    }  };
  // Handle PDF upload
  const handlePdfUpload = async () => {
    if (!selectedPdfFile) {
      showUploadNotification('Please select a PDF file first', 'error');
      return;
    }

    showUploadNotification('Uploading PDF...', 'processing');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedPdfFile);

      const response = await fetch('http://localhost:8000/upload/pdf', {
        method: 'POST',
        body: formData
      });      const result = await response.json();
        if (result.status === 'success') {
        showUploadNotification(`PDF uploaded successfully! Doc ID: ${result.doc_id}`, 'success');
        setSelectedPdfFile(null); // Clear selected file
      } else if (result.status === 'duplicate') {
        showUploadNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'duplicate');
        setSelectedPdfFile(null); // Clear selected file
      } else {
        showUploadNotification(`Error: ${result.message}`, 'error');
      }
    } catch (error) {
      showUploadNotification(`Error uploading PDF: ${error.message}`, 'error');
    }  };
  // Handle DOCX upload
  const handleDocxUpload = async () => {
    if (!selectedDocxFile) {
      showUploadNotification('Please select a DOCX file first', 'error');
      return;
    }

    showUploadNotification('Uploading DOCX...', 'processing');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedDocxFile);

      const response = await fetch('http://localhost:8000/upload/docx', {
        method: 'POST',
        body: formData
      });      const result = await response.json();
        if (result.status === 'success') {
        showUploadNotification(`DOCX uploaded successfully! Doc ID: ${result.doc_id}`, 'success');
        setSelectedDocxFile(null); // Clear selected file
      } else if (result.status === 'duplicate') {
        showUploadNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'duplicate');
        setSelectedDocxFile(null); // Clear selected file
      } else {
        showUploadNotification(`Error: ${result.message}`, 'error');      }
    } catch (error) {
      showUploadNotification(`Error uploading DOCX: ${error.message}`, 'error');
    }
  };
  // Handle PPT upload
  const handlePptUpload = async () => {
    if (!selectedPptFile) {
      showUploadNotification('Please select a PPT file first', 'error');
      return;
    }

    showUploadNotification('Uploading PPT...', 'processing');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedPptFile);

      const response = await fetch('http://localhost:8000/upload/ppt', {
        method: 'POST',
        body: formData
      });      const result = await response.json();
        if (result.status === 'success') {
        showUploadNotification(`PPT uploaded successfully! Doc ID: ${result.doc_id}`, 'success');
        setSelectedPptFile(null); // Clear selected file
      } else if (result.status === 'duplicate') {
        showUploadNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'duplicate');
        setSelectedPptFile(null); // Clear selected file
      } else {
        showUploadNotification(`Error: ${result.message}`, 'error');
      }
    } catch (error) {
      showUploadNotification(`Error uploading PPT: ${error.message}`, 'error');
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([
      { type: 'bot', text: "Hello! I'm your knowledge base assistant. Upload PDFs or provide website URLs to help me answer your questions better." }
    ]);
  };

  // Handle chat message sending
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to chat
    const newMessages = [...messages, { type: 'user', text: userMessage }];
    setMessages(newMessages);

    try {
      // Prepare chat history for API (exclude the welcome message)
      const chatHistory = newMessages
        .slice(1) // Remove welcome message
        .map(msg => ({
          question: msg.type === 'user' ? msg.text : '',
          answer: msg.type === 'bot' ? msg.text : ''
        }))
        .filter(exchange => exchange.question || exchange.answer);

      const response = await fetch('http://localhost:8000/Agentchat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          history: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Add bot response to chat
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: result.response || 'Sorry, I couldn\'t generate a response.' 
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I encountered an error while processing your question. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="settings-page">
    <Topbar />
    <Sidebar />
      <div className="settings-split-container">  
        <div className="settings-upload-panel" key="upload-panel">
          <h3>Impart Knowledge</h3>        
          {uploadStatus && (
            <div className={`upload-status ${uploadStatusType} ${showNotification ? 'show' : 'hide'}`}>
              <span className="status-icon">{getStatusIcon(uploadStatusType)}</span>
              {uploadStatus}
              <button 
                className="notification-close"
                onClick={dismissNotification}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          )}
          <form>
            <div>
              <input 
                type="text" 
                placeholder="https://example.com" 
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <button type="button" onClick={handleProcessWebsite}>Process Website</button>
            </div>          <div>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => setSelectedPdfFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" style={{ 
                display: 'block',
                padding: '0.875rem 1rem',
                border: '2px dashed rgba(72, 132, 200, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                transition: 'all 0.3s ease'
              }}>
                {selectedPdfFile ? selectedPdfFile.name : 'Choose PDF file...'}
              </label>
              <button type="button" title="First choose file to upload" onClick={handlePdfUpload} disabled={!selectedPdfFile}>
                Upload PDF
              </button>
            </div>
            <div>
              <input 
                type="file" 
                accept=".docx" 
                onChange={(e) => setSelectedDocxFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="docx-upload"
              />
              <label htmlFor="docx-upload" style={{ 
                display: 'block',
                padding: '0.875rem 1rem',
                border: '2px dashed rgba(72, 132, 200, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                transition: 'all 0.3s ease'
              }}>
                {selectedDocxFile ? selectedDocxFile.name : 'Choose DOCX file...'}
              </label>
              <button type="button" title="First choose file to upload" onClick={handleDocxUpload} disabled={!selectedDocxFile}>
                Upload DOCX
              </button>          </div>
            <div>
              <input 
                type="file" 
                accept=".ppt,.pptx" 
                onChange={(e) => setSelectedPptFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="ppt-upload"
              />
              <label htmlFor="ppt-upload" style={{ 
                display: 'block',
                padding: '0.875rem 1rem',
                border: '2px dashed rgba(72, 132, 200, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                transition: 'all 0.3s ease'
              }}>
                {selectedPptFile ? selectedPptFile.name : 'Choose PPT file...'}
              </label>
              <button type="button" title="First choose file to upload" onClick={handlePptUpload} disabled={!selectedPptFile}>
                Upload PPT
              </button>
            </div>
          </form>
        </div>

        <div className="settings-chat-panel" key="chat-panel">
          <div className="chat-header">
            <h3>Vega Insight Chat</h3>
            <button 
              className="clear-chat-btn" 
              onClick={clearChat}
              title="Clear chat history"
            >
              Clear Chat
            </button>
          </div>
          <div className="chat-messages" ref={messagesEndRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.type}`}>
                {msg.type === 'bot' ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message bot loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form
            className="chat-input-form"
            onSubmit={handleChatSubmit}
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()}>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;