import React, { useState, useEffect, useRef } from 'react';
import './chatSuggestionsLayout.css';

// List of suggestion queries that will be shown
const SUGGESTION_QUERIES = [
  "How do I configure SSO with Salesforce?",
  "What are the steps to set up PingFederate?",
  "How do I troubleshoot authentication failures?",
  "What's the difference between OAuth and SAML?",
  "How do I implement multi-factor authentication?",
  "Can you explain JSON Web Tokens (JWT)?",
  "What are best practices for securing PingFederate?",
  "How do I connect to Azure AD?",
  "What authentication protocols does PingFederate support?",
  "How do I create a custom authentication adapter?"
];

// Animation suggestions - shorter list for the input animation
const ANIMATION_SUGGESTIONS = [
  "How do I set up PingFederate?",
  "Troubleshoot authentication failures",
  "Configure SSO with Salesforce",
  "Best security practices",
  "Connect to Microsoft Entra ID",
  "Implement multi-factor authentication"
];

const ChatSuggestions = ({ onSelectSuggestion, showSuggestions, updatePlaceholder }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const dropdownRef = useRef(null);
  
  // Update dropdown state based on prop
  useEffect(() => {
    if (showSuggestions !== undefined) {
      setShowDropdown(showSuggestions);
    }
  }, [showSuggestions]);
  
  // Cycle through suggestions and update the placeholder only if conversation hasn't started
  useEffect(() => {
    // Change suggestion every 5 seconds
    const suggestionInterval = setInterval(() => {
      const nextIndex = (currentSuggestion + 1) % ANIMATION_SUGGESTIONS.length;
      setCurrentSuggestion(nextIndex);
      
      // Call the updatePlaceholder function if provided
      if (updatePlaceholder && typeof updatePlaceholder === 'function') {
        updatePlaceholder(`Try asking: "${ANIMATION_SUGGESTIONS[nextIndex]}"`);
      }
    }, 5000);
    
    // Initialize placeholder on first render
    if (updatePlaceholder && typeof updatePlaceholder === 'function') {
      updatePlaceholder(`Try asking: "${ANIMATION_SUGGESTIONS[currentSuggestion]}"`);
    }
    
    return () => clearInterval(suggestionInterval);
  }, [currentSuggestion, updatePlaceholder]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only check if the dropdown is currently shown
      if (showDropdown && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          !event.target.closest('input[type="text"]')) {
        setShowDropdown(false);
      }
    };
    
    // Toggle dropdown when clicking on the input
    const handleInputFocus = () => {
      setShowDropdown(true);
    };
    
    const inputElement = document.querySelector('.chat-input-area input[type="text"]');
    if (inputElement) {
      inputElement.addEventListener('focus', handleInputFocus);
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (inputElement) {
        inputElement.removeEventListener('focus', handleInputFocus);
      }
    };
  }, [showDropdown]);

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    onSelectSuggestion(suggestion);
    setShowDropdown(false);
    
    // Add a small delay before hiding to make the transition smoother
    setTimeout(() => {
      setShowDropdown(false);
    }, 100);
  };

  return (
    <>
      {/* Only keep the dropdown */}
      <div 
        ref={dropdownRef} 
        className={`suggestions-dropdown ${showDropdown ? 'active' : ''}`}
      >
        <div className="suggestion-heading">Suggested questions:</div>
        {SUGGESTION_QUERIES.map((suggestion, index) => (
          <div 
            key={index}
            className="suggestion-item"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            {suggestion}
          </div>
        ))}
      </div>
    </>
  );
};

export default ChatSuggestions;
