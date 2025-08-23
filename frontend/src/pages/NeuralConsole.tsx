import { useState, useRef, useEffect } from "react"
import { Mic, Send, Brain, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"

interface Message {
  id: string
  content: string
  sender: "user" | "vega"
  timestamp: Date
  type?: "text" | "speech"
}

export default function NeuralConsole() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Welcome to the Neural Console! I'm Vega, your AI assistant. How can I help you today?",
      sender: "vega",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [recording, setRecording] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand your question. Let me analyze that for you.",
        "That's an interesting point. Based on my knowledge, I can help you with that.",
        "Great question! I'm processing your request using my neural networks.",
        "I've analyzed your input. Here's what I can tell you...",
        "Let me help you with that. I'm accessing relevant information now."
      ]
      
      setIsTyping(false)
      const response: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "vega",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, response])
    }, 2000)
  }

  const handleMicToggle = () => {
    setRecording(!recording)
    // Simulate speech-to-text
    if (!recording) {
      setTimeout(() => {
        setRecording(false)
        // Simulate transcribed text
        setInputMessage("What can you tell me about...")
      }, 3000)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        content: "Welcome to the Neural Console! I'm Vega, your AI assistant. How can I help you today?",
        sender: "vega",
        timestamp: new Date()
      }
    ])
    setInputMessage("")
    setIsTyping(false)
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neural rounded-lg shadow-neural">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Neural Console</h1>
            <p className="text-muted-foreground">
              General-purpose AI assistant for any task
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 p-6">
        {/* Left Panel */}
        <Card className="w-80 h-full flex flex-col shadow-neural">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Conversation History</h3>
            <p className="text-sm text-muted-foreground">Recent chats and sessions</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {/* Mock conversation history */}
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium text-sm">Data Analysis Help</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium text-sm">Code Review Session</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium text-sm">Project Planning</p>
                <p className="text-xs text-muted-foreground">2 days ago</p>
              </div>
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium text-sm">Technical Questions</p>
                <p className="text-xs text-muted-foreground">3 days ago</p>
              </div>
            </div>
          </ScrollArea>
        </Card>

        {/* Center Chat Panel */}
        <Card className="flex-1 h-full flex flex-col shadow-neural">
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div className={`max-w-[75%] ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground ml-4"
                      : "bg-muted text-foreground mr-4"
                  } rounded-2xl px-6 py-4 shadow-card`}>
                    <div className="flex items-start gap-3">
                      {message.sender === "vega" && (
                        <div className="w-6 h-6 bg-neural rounded-full flex items-center justify-center mt-0.5">
                          <Sparkles className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted text-foreground rounded-2xl px-6 py-4 mr-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-neural rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Button
                variant={recording ? "destructive" : "outline"}
                size="icon"
                onClick={handleMicToggle}
                className={recording ? "bg-destructive text-destructive-foreground shadow-neural" : ""}
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  placeholder="Ask Vega anything..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="pr-12 bg-background border-border focus:border-primary"
                />
                <Button
                  variant="neural"
                  size="icon"
                  onClick={handleSendMessage}
                  className="absolute right-1 top-1 h-8 w-8"
                  disabled={!inputMessage.trim()}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {recording && (
              <div className="mt-3 text-center animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  <span className="inline-block w-2 h-2 bg-destructive rounded-full mr-2" />
                  Listening... Speak now
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Right Panel */}
        <Card className="w-80 h-full flex flex-col shadow-neural">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Frequently used tools</p>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {/* Quick Action Buttons */}
            <Button variant="outline" className="w-full justify-start h-12">
              <Brain className="w-4 h-4 mr-3" />
              Analyze Document
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <Sparkles className="w-4 h-4 mr-3" />
              Generate Summary
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <Send className="w-4 h-4 mr-3" />
              Quick Translation
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <Mic className="w-4 h-4 mr-3" />
              Voice Commands
            </Button>
            
            {/* Clear Chat Button */}
            <Button 
              variant="destructive" 
              className="w-full justify-start h-12 bg-destructive hover:bg-destructive/90"
              onClick={handleClearChat}
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Clear Chat
            </Button>
            
            {/* Settings/Status Section */}
            <div className="mt-8 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-3">AI Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Model</span>
                  <span className="text-xs font-medium">Vega-3.5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Response Time</span>
                  <span className="text-xs font-medium text-success">Fast</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Accuracy</span>
                  <span className="text-xs font-medium text-success">High</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}