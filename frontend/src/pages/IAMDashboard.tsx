import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { 
  Shield, 
  Users, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Server,
  Lock,
  Unlock,
  Eye,
  MessageCircle,
  ChevronRight,
  Trash2,
  Send,
  Mic,
  Paperclip,
  TrendingUp,
  TrendingDown,
  Globe,
  FileKey,
  UserCheck,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/utils/auth"
import { api } from "@/utils/api"

// Extend Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatMessage {
  id: string
  content: string
  sender: "user" | "vega"
  timestamp: Date
  type?: "text" | "speech"
}

export default function IAMDashboard() {
  const { toast } = useToast()
  
  // Chat functionality state
  const [chatMessage, setChatMessage] = useState("")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [iamChatHistory, setIamChatHistory] = useState<ChatMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isRecordingIamChat, setIsRecordingIamChat] = useState(false)
  const [autoSendPendingIamChat, setAutoSendPendingIamChat] = useState(false)
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false)
  const [uploadedChatFile, setUploadedChatFile] = useState<{content: string, name: string} | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Chat History Management Functions
  const getIamChatHistory = () => {
    const stored = sessionStorage.getItem('IAMDashboard_ChatHistory');
    return stored ? JSON.parse(stored) : {};
  };

  const updateIamChatHistory = (key: string, value: string) => {
    const currentHistory = getIamChatHistory();
    currentHistory[key] = value;
    sessionStorage.setItem('IAMDashboard_ChatHistory', JSON.stringify(currentHistory));
  };

  const clearIamChatHistoryStorage = () => {
    sessionStorage.removeItem('IAMDashboard_ChatHistory');
  };

  // Load chat history on component mount
  useEffect(() => {
    const savedHistory = getIamChatHistory();
    if (savedHistory && Object.keys(savedHistory).length > 0) {
      const messages: ChatMessage[] = [];
      const messageCount = Math.floor(Object.keys(savedHistory).length / 2);
      
      for (let i = 1; i <= messageCount; i++) {
        const userMessage = savedHistory[`User_message_${i}`];
        const aiMessage = savedHistory[`AI_message_${i}`];
        
        if (userMessage) {
          messages.push({
            id: `user-${i}`,
            content: userMessage,
            sender: "user",
            timestamp: new Date(),
          });
        }
        
        if (aiMessage) {
          messages.push({
            id: `ai-${i}`,
            content: aiMessage,
            sender: "vega",
            timestamp: new Date(),
          });
        }
      }
      
      setIamChatHistory(messages);
    }
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [iamChatHistory, isChatLoading])

  const handleChatToggle = (open: boolean) => {
    if (open) {
      setIsChatOpen(true)
      setIsEntering(true)
      setTimeout(() => {
        setIsEntering(false)
      }, 50)
    } else {
      setIsAnimating(true)
      setTimeout(() => {
        setIsChatOpen(false)
        setIsAnimating(false)
      }, 300)
    }
  }

  // Chat functionality functions
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return

    const userMessage = chatMessage.trim();
    
    // Prepare the message content
    let displayMessage = userMessage;
    if (uploadedChatFile) {
      displayMessage = `📎${userMessage}`;
    }
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: displayMessage,
      sender: "user",
      timestamp: new Date(),
    }

    setIamChatHistory(prev => [...prev, newMessage])
    setChatMessage("")
    setIsChatLoading(true)

    try {
      // Get current chat history from sessionStorage (previous messages only)
      const storedChatHistory = getIamChatHistory();
      
      console.log('IAMDashboard - Chat History being sent to backend:', storedChatHistory)

      // Prepare request body
      const requestBody: any = {
        question: userMessage,
        history: storedChatHistory
      };

      // Include file data if file is uploaded
      if (uploadedChatFile) {
        requestBody.file_content = uploadedChatFile.content;
        requestBody.file_name = uploadedChatFile.name;
      }

      const response = await api.fetchWithAuth('/Agentchat', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        const botResponse = data.response || 'Sorry, I couldn\'t generate a response.';
        
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: botResponse,
          sender: "vega",
          timestamp: new Date(),
        }
        setIamChatHistory(prev => [...prev, botMessage])

        // After getting response, add BOTH user message and AI response to chat history
        const chatHistory = getIamChatHistory();
        
        // Count existing user messages to get the next message number
        const userMessageCount = Object.keys(chatHistory).filter(key => key.startsWith('User_message_')).length;
        const nextMessageNumber = userMessageCount + 1;
        
        const userKey = `User_message_${nextMessageNumber}`;
        const aiKey = `AI_message_${nextMessageNumber}`;
        
        // Include file info in chat history if file was sent
        const historyUserMessage = uploadedChatFile 
          ? `File: ${uploadedChatFile.name} - ${userMessage}`
          : userMessage;
        
        updateIamChatHistory(userKey, historyUserMessage);
        updateIamChatHistory(aiKey, botResponse);
        
        // Clear the uploaded file after sending
        setUploadedChatFile(null);
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('IAMDashboard chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "vega",
        timestamp: new Date(),
      }
      setIamChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    setChatMessage(transcript)
  }

  // Clear chat history for IAM dashboard
  const clearIamChat = () => {
    setIamChatHistory([])
    setChatMessage("")
    clearIamChatHistoryStorage()
  }

  // Mic toggle function for IAM dashboard chat
  const handleMicToggle = () => {
    if (!isRecordingIamChat) {
      startVoiceRecognition()
    } else {
      stopVoiceRecognition()
    }
  }

  const startVoiceRecognition = () => {
    const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    
    if (!isSupported) {
      console.error("Speech recognition not supported in this browser.")
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event: any) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript
      }
      handleVoiceTranscript(transcript)
    }

    recognition.onstart = () => {
      setIsRecordingIamChat(true)
    }

    recognition.onend = () => {
      setIsRecordingIamChat(false)
      recognitionRef.current = null
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setIsRecordingIamChat(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecordingIamChat(false)
  }

  // File upload handler for chat
  const handleChatFileUploadClick = () => {
    chatFileInputRef.current?.click()
  }

  const handleChatFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/plain') {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt file",
        variant: "destructive",
      })
      return
    }

    setIsUploadingChatFile(true)
    try {
      const content = await file.text()
      setUploadedChatFile({
        content,
        name: file.name
      })
      toast({
        title: "File uploaded",
        description: `${file.name} is ready to be sent`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error reading file:', error)
      toast({
        title: "Upload failed",
        description: "Failed to read the file",
        variant: "destructive",
      })
    } finally {
      setIsUploadingChatFile(false)
    }
  }

  return (
    <TooltipProvider>
    <div className="p-6 space-y-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IAM Dashboard</h1>
          <p className="text-muted-foreground">
            Identity and Access Management Control Center
          </p>
        </div>
      </div>

      {/* Row 1: Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +12 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Password Resets</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">
              98% success rate today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="w-3 h-3 mr-1 text-green-500" />
              -5 from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Certificate Renewals, License Status & Environment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Certificate Renewals</CardTitle>
            <CardDescription>
              SSL/TLS certificate expiration tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileKey className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">sso.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  12 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileKey className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">api.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  18 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileKey className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">vpn.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  3 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileKey className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">mail.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  25 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileKey className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">portal.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  35 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">auth.company.com</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ✓ Renewed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License Status</CardTitle>
            <CardDescription>
              Identity platform license monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Pingidentity</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  156 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Support Contract</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  45 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Keycloak</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Open Source
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Okta Integration</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  89 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Azure AD Premium</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  32 days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">LDAP Services</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Status</CardTitle>
            <CardDescription>
              Pingidentity & Keycloak unified management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Production */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Production</h4>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  4/4 nodes
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ping-prod-1
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ping-prod-2
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  keycloak-prod-1
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  keycloak-prod-2
                </div>
              </div>
            </div>

            {/* Staging */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Staging</h4>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  2/3 nodes
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ping-staging-1
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  keycloak-staging-1
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  keycloak-staging-2
                </div>
              </div>
            </div>

            {/* Development */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Development</h4>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  2/2 nodes
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ping-dev-1
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  keycloak-dev-1
                </div>
              </div>
            </div>

            {/* Agent Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agent Uptime</span>
                <span className="text-sm font-bold text-green-600">99.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: SSO Transaction Overview, Live IAM Activity Board & Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              SSO Transaction Overview (This Week)
            </CardTitle>
            <CardDescription>
              Single Sign-On authentication metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Chart Area - Full width with much larger height */}
              <div className="h-96 bg-slate-900 rounded-lg p-3 relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="14.3" height="16" patternUnits="userSpaceOnUse">
                      <path d="M 14.3 0 L 0 0 0 16" fill="none" stroke="rgb(71 85 105 / 0.3)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="72%" fill="url(#grid)" />
                  
                  {/* Y-axis labels */}
                  <text x="2" y="10" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="start">1600</text>
                  <text x="2" y="25" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="start">1200</text>
                  <text x="2" y="40" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="start">800</text>
                  <text x="2" y="55" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="start">400</text>
                  <text x="2" y="70" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="start">0</text>
                  
                  {/* Success line (green) - Full width */}
                  <polyline
                    fill="none"
                    stroke="rgb(34 197 94)"
                    strokeWidth="1"
                    points="10,58 24,28 38,43 52,33 66,18 80,13 94,28"
                  />
                  
                  {/* Success points */}
                  <circle cx="10" cy="58" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="24" cy="28" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="38" cy="43" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="52" cy="33" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="66" cy="18" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="80" cy="13" r="1.5" fill="rgb(34 197 94)" />
                  <circle cx="94" cy="28" r="1.5" fill="rgb(34 197 94)" />
                  
                  {/* Failed line (red) - much lower */}
                  <polyline
                    fill="none"
                    stroke="rgb(239 68 68)"
                    strokeWidth="1"
                    points="10,70 24,70 38,70 52,70 66,70 80,70 94,70"
                  />
                  
                  {/* Failed points */}
                  <circle cx="10" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="24" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="38" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="52" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="66" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="80" cy="70" r="1" fill="rgb(239 68 68)" />
                  <circle cx="94" cy="70" r="1" fill="rgb(239 68 68)" />
                  
                  {/* X-axis labels */}
                  <text x="10" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Mon</text>
                  <text x="24" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Tue</text>
                  <text x="38" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Wed</text>
                  <text x="52" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Thu</text>
                  <text x="66" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Fri</text>
                  <text x="80" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Sat</text>
                  <text x="94" y="82" fill="rgb(148 163 184)" fontSize="3.5" textAnchor="middle">Sun</text>
                </svg>
              </div>
              
              {/* Summary Statistics - Full width with space-between */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">8,683 Successful</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">89 Failed (1.0%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live IAM Activity Board</CardTitle>
            <CardDescription>
              Real-time identity management activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Needs Attention */}
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">🔴 Needs Attention</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <FileKey className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Certificate Pingidentity Prod expires in 20 days</p>
                    <p className="text-xs text-muted-foreground">Sarah notified</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending/Scheduled */}
            <div>
              <h4 className="text-sm font-medium text-yellow-600 mb-2">🟡 Pending/Scheduled</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Settings className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Certificate sso.company.com & api.company.com</p>
                    <p className="text-xs text-muted-foreground">Thu 5-7am • System Security team notified</p>
                  </div>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div>
              <h4 className="text-sm font-medium text-blue-600 mb-2">🔵 In Progress</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <UserCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Processing 23 failed login attempts</p>
                    <p className="text-xs text-muted-foreground">Auto-unlock initiated</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">🟢 Completed</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Certificate auth.company.com renewed 45 days early</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>
              Real-time security monitoring and threat detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 mb-2">23</div>
                  <div className="text-sm text-muted-foreground">Failed logins</div>
                  <div className="text-xs text-muted-foreground mt-1">Last 24h</div>
                </div>
                <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">2</div>
                  <div className="text-sm text-muted-foreground">Compliance violations</div>
                  <div className="text-xs text-muted-foreground mt-1">Require attention</div>
                </div>
                <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">18</div>
                  <div className="text-sm text-muted-foreground">Auto-resolved</div>
                  <div className="text-xs text-muted-foreground mt-1">Today</div>
                </div>
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">94%</div>
                  <div className="text-sm text-muted-foreground">MFA Adoption</div>
                  <div className="text-xs text-muted-foreground mt-1">Enterprise-wide</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      All critical issues resolved
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    System status: Healthy • Last check: 2 minutes ago
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Real-time monitoring active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    24/7 threat detection • AI-powered analysis
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Chat Toggle Button - only show when chat is closed */}
      {!isChatOpen && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes triplePulse {
                0%, 100% {
                  opacity: 1;
                }
                5%, 15%, 25% {
                  opacity: 0.4;
                }
              }
              .triple-pulse {
                animation: triplePulse 6s infinite;
              }
              .triple-pulse:hover {
                animation: none;
                opacity: 1;
              }
            `
          }} />
          <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="neural"
                  size="icon"
                  onClick={() => handleChatToggle(true)}
                  className="h-12 w-12 rounded-full shadow-lg transition-transform duration-300 triple-pulse"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Open IAM Assistant</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </>
      )}

      {/* Chat Modal/Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop/Overlay */}
          <div 
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              isAnimating ? 'opacity-0' : 
              isEntering ? 'opacity-0' : 
              'opacity-100'
            }`}
            onClick={() => handleChatToggle(false)}
          />
          
          {/* Chat Panel - Right Side, Full Height */}
          <div className="ml-auto relative z-10 w-[40rem] max-w-[90vw] h-full">
            {/* Moving Toggle Button - Outside the panel */}
            <div className={`absolute -left-6 top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 ${
              isAnimating ? 'translate-x-full opacity-0' : 
              isEntering ? 'translate-x-full' : 
              'translate-x-0'
            }`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="neural"
                    size="icon"
                    onClick={() => handleChatToggle(false)}
                    className="h-12 w-12 rounded-full shadow-lg transition-transform duration-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Close Chat</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Card className={`h-full flex flex-col rounded-none rounded-l-lg transition-transform duration-300 ease-in-out ${
              isAnimating ? 'transform translate-x-full' : 
              isEntering ? 'transform translate-x-full' : 
              'transform translate-x-0'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    IAM Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask questions about identity and access management
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearIamChat}
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleChatToggle(false)}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex-1 bg-muted/20 rounded-lg p-4 overflow-auto relative scrollbar-thin scrollbar-track-background scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                  {iamChatHistory.length === 0 ? (
                    <div className="text-muted-foreground text-center flex items-center justify-center h-full">
                      <div>
                        <Shield className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Ask me about IAM security, certificates, or user management</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {iamChatHistory.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.sender === "vega" ? (
                              <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*]:mb-2 [&>*:last-child]:mb-0">
                                <ReactMarkdown>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              <span className="text-sm text-muted-foreground">Vega is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatMessagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={isRecordingIamChat ? "destructive" : "outline"}
                    size="icon"
                    onClick={handleMicToggle}
                    className={isRecordingIamChat ? "bg-destructive text-destructive-foreground" : ""}
                  >
                    <Mic />
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleChatFileUploadClick}
                            disabled={isUploadingChatFile}
                          >
                            {isUploadingChatFile ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Paperclip className="w-4 h-4" />
                            )}
                          </Button>
                          {uploadedChatFile && (
                            <Badge 
                              variant="default" 
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              1
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{uploadedChatFile ? `File ready: ${uploadedChatFile.name}` : "Upload .txt file"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleChatFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Input
                    ref={chatInputRef}
                    placeholder="Ask about IAM security, certificates, or access management..."
                    value={chatMessage}
                    onChange={(e) => {
                      setChatMessage(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={isChatLoading}
                    className="flex-1"
                  />
                  <Button 
                    variant="neural" 
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || isChatLoading}
                  >
                    {isChatLoading ? 'Sending...' : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  IAM Assistant can help with security questions, certificate management, and access control policies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
