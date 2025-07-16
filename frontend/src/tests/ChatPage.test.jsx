import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPage from '../pages/ChatPage';

// Mock the chat API
global.fetch = vi.fn();

// Mock components that might be used in ChatPage
vi.mock('../components/avatar', () => ({
  default: () => <div>Avatar Component</div>
}));

vi.mock('../components/ChatSuggestions', () => ({
  default: ({ onSuggestionClick }) => (
    <div>
      <button onClick={() => onSuggestionClick('How can I help you?')}>
        Suggestion 1
      </button>
    </div>
  )
}));

vi.mock('../components/voicetotext', () => ({
  default: ({ onTranscript }) => (
    <button onClick={() => onTranscript('Hello from voice')}>
      Voice Input
    </button>
  )
}));

const renderChatPage = () => {
  return render(<ChatPage />);
};

describe('ChatPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  it('renders chat interface', () => {
    renderChatPage();
    
    // Look for common chat interface elements
    expect(screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i }) || screen.getByText(/send/i)).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Hello! How can I help you?' })
    });

    renderChatPage();
    
    const messageInput = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
    const sendButton = screen.getByRole('button', { name: /send/i }) || screen.getByText(/send/i);

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Hello')
        })
      );
    });
  });

  it('clears input after sending message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Hello! How can I help you?' })
    });

    renderChatPage();
    
    const messageInput = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
    const sendButton = screen.getByRole('button', { name: /send/i }) || screen.getByText(/send/i);

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(messageInput.value).toBe('');
    });
  });

  it('handles chat suggestions', () => {
    renderChatPage();
    
    const suggestionButton = screen.getByText('Suggestion 1');
    const messageInput = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);

    fireEvent.click(suggestionButton);

    expect(messageInput.value).toBe('How can I help you?');
  });

  it('handles voice input', () => {
    renderChatPage();
    
    const voiceButton = screen.getByText('Voice Input');
    const messageInput = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);

    fireEvent.click(voiceButton);

    expect(messageInput.value).toBe('Hello from voice');
  });

  it('displays error message on failed API call', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    renderChatPage();
    
    const messageInput = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
    const sendButton = screen.getByRole('button', { name: /send/i }) || screen.getByText(/send/i);

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('prevents sending empty messages', () => {
    renderChatPage();
    
    const sendButton = screen.getByRole('button', { name: /send/i }) || screen.getByText(/send/i);
    fireEvent.click(sendButton);

    // Should not make API call with empty message
    expect(fetch).not.toHaveBeenCalled();
  });
});
