import React, { useState, useEffect, useRef } from 'react';

// List of suggestion queries that will be shown
const SUGGESTION_QUERIES = [
  "How do I configure SSO with Salesforce?",
  "What are the steps to set up OAuth authentication?",
  "How do I troubleshoot authentication failures?",
  "What's the difference between OAuth and SAML?",
  "How do I implement multi-factor authentication?",
  "Can you explain JSON Web Tokens (JWT)?",
  "What are best practices for securing integrations?",
  "How do I connect to Azure AD?",
  "What authentication protocols are supported?",
  "How do I create a custom authentication adapter?"
];

// Animation suggestions - shorter list for the input animation
const ANIMATION_SUGGESTIONS = [
  "How do I set up OAuth authentication?",
  "Troubleshoot authentication failures",
  "Configure SSO with Salesforce",
  "Best security practices",
  "Connect to Microsoft Entra ID",
  "Implement multi-factor authentication"
];

interface ChatSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
  showSuggestions: boolean;
  updatePlaceholder?: (placeholder: string) => void;
  conversationStarted?: boolean; // Add this prop to better control visibility
}

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ 
  onSelectSuggestion, 
  showSuggestions, 
  updatePlaceholder,
  conversationStarted = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Update dropdown state based on prop and conversation status
  useEffect(() => {
    if (conversationStarted) {
      setShowDropdown(false);
    } else if (showSuggestions !== undefined) {
      setShowDropdown(showSuggestions);
    }
  }, [showSuggestions, conversationStarted]);
  
  // Cycle through suggestions and update the placeholder only if conversation hasn't started
  useEffect(() => {
    // Don't cycle suggestions if conversation has started
    if (conversationStarted) return;
    
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
  }, [currentSuggestion, updatePlaceholder, conversationStarted]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only check if the dropdown is currently shown
      if (showDropdown && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          !(event.target as Element)?.closest('input[type="text"]')) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setShowDropdown(false);
    
    // Add a small delay before hiding to make the transition smoother
    setTimeout(() => {
      setShowDropdown(false);
    }, 100);
  };

  return (
    <>
      {/* Suggestions dropdown */}
      <div 
        ref={dropdownRef} 
        className={`absolute bottom-full left-0 right-0 mb-2 border rounded-lg shadow-xl z-[1000] transition-all duration-200 ${
          showDropdown ? 'opacity-100 visible transform translate-y-0' : 'opacity-0 invisible transform translate-y-2 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
          color: 'hsl(var(--card-foreground))',
        }}
      >
        <div 
          className="p-3 border-b text-sm font-medium"
          style={{
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          Suggested questions:
        </div>
        <div 
          className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-slate-600"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(148 163 184) transparent'
          }}
        >
          {SUGGESTION_QUERIES.map((suggestion, index) => (
            <div 
              key={index}
              className="p-3 cursor-pointer text-sm border-b last:border-b-0 transition-all duration-200 hover:bg-opacity-80"
              style={{
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ChatSuggestions;
