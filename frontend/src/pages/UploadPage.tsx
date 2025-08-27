import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { 
  Upload, 
  File, 
  FileText, 
  FileImage, 
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Filter,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Link,
  Globe,
  Mic,
  Send,
  Paperclip
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

interface UploadedFile {
  id: string
  name: string
  type: "PDF" | "DOCX" | "TXT" | "CSV" | "XLSX" | "IMAGE" | "URL" | "PPT"
  size: string
  status: "indexed" | "processing" | "error"
  uploadDate: Date
  lastModified: Date
}

interface ChatMessage {
  id: string
  content: string
  sender: "user" | "vega"
  timestamp: Date
  type?: "text" | "speech"
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all") 
  const [searchTerm, setSearchTerm] = useState("")
  const [chatMessage, setChatMessage] = useState("")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  
  // URL upload states
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Chat functionality state
  const [uploadPageChatHistory, setUploadPageChatHistory] = useState<ChatMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isRecordingUploadChat, setIsRecordingUploadChat] = useState(false)
  const [autoSendPendingUploadChat, setAutoSendPendingUploadChat] = useState(false)
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false)
  const [uploadedChatFile, setUploadedChatFile] = useState<{content: string, name: string} | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Chat History Management Functions - similar to IntegrationWorkspace
  const getUploadPageChatHistory = () => {
    const stored = sessionStorage.getItem('UploadPage_ChatHistory');
    return stored ? JSON.parse(stored) : {};
  };

  const updateUploadPageChatHistory = (key: string, message: string) => {
    const chatHistory = getUploadPageChatHistory();
    chatHistory[key] = message;
    sessionStorage.setItem('UploadPage_ChatHistory', JSON.stringify(chatHistory));
  };

  const clearUploadPageChatHistoryStorage = () => {
    sessionStorage.removeItem('UploadPage_ChatHistory');
  };
  
  // Toast hook for notifications
  const { toast } = useToast()

  const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"

  // Function to fetch files from backend
  const fetchFiles = async () => {
    try {
      setIsLoadingFiles(true)
      const authToken = localStorage.getItem('authToken')
      const tokenType = localStorage.getItem('tokenType') || 'Bearer'

      const response = await fetch(`${API_BASE}/files`, {
        headers: {
          'Authorization': `${tokenType} ${authToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showNotification('Authentication failed. Please login again.', 'error')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform backend data to match frontend interface
      const transformedFiles = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type as "PDF" | "DOCX" | "TXT" | "CSV" | "XLSX" | "IMAGE" | "URL" | "PPT",
        size: file.size,
        status: file.status as "indexed" | "processing" | "error",
        uploadDate: new Date(file.uploadDate),
        lastModified: new Date(file.lastModified || file.uploadDate)
      }))
      
      setFiles(transformedFiles)
    } catch (error) {
      console.error('Error fetching files:', error)
      showNotification('Failed to load files', 'error')
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Function to delete a file
  const deleteFile = async (fileId: string) => {
    try {
      const authToken = localStorage.getItem('authToken')
      const tokenType = localStorage.getItem('tokenType') || 'Bearer'

      const response = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `${tokenType} ${authToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showNotification('Authentication failed. Please login again.', 'error')
          return
        }
        if (response.status === 404) {
          showNotification('File not found or access denied', 'error')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Remove file from local state
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId))
      setSelectedFiles(prevSelected => prevSelected.filter(id => id !== fileId))
      showNotification('File record and vectors deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting file:', error)
      showNotification('Failed to delete file', 'error')
    }
  }

  // Load files on component mount
  useEffect(() => {
    fetchFiles()
  }, [])

  const handleChatToggle = (open: boolean) => {
    if (open) {
      setIsChatOpen(true)
      setIsEntering(true)
      // Start the entrance animation after the modal is rendered
      setTimeout(() => {
        setIsEntering(false)
      }, 50) // Small delay to ensure DOM update
    } else {
      setIsAnimating(true)
      // Delay hiding the modal to allow exit animation
      setTimeout(() => {
        setIsChatOpen(false)
        setIsAnimating(false)
      }, 300)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="w-5 h-5 text-red-600" />
      case "DOCX":
        return <FileText className="w-5 h-5 text-blue-600" />
      case "PPT":
        return <FileText className="w-5 h-5 text-orange-600" />
      case "TXT":
        return <File className="w-5 h-5 text-gray-600" />
      case "CSV":
      case "XLSX":
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />
      case "IMAGE":
        return <FileImage className="w-5 h-5 text-purple-600" />
      case "URL":
        return <Globe className="w-5 h-5 text-blue-500" />
      default:
        return <File className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Indexed
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        )
      case "error":
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  const showNotification = (message: string, type: "success" | "error" | "processing") => {
    if (type === "success") {
      toast({
        title: "✅ Success",
        description: message,
        variant: "default",
      })
    } else if (type === "error") {
      toast({
        title: "❌ Error",
        description: message,
        variant: "destructive",
      })
    } else if (type === "processing") {
      toast({
        title: "⏳ Processing",
        description: message,
        variant: "default",
      })
    }
  }

  const handleProcessWebsite = async () => {
    if (!websiteUrl.trim()) {
      showNotification('Please enter a valid website URL', 'error')
      return
    }

    // Validate URL format
    try {
      new URL(websiteUrl)
    } catch {
      showNotification('Please enter a valid URL format', 'error')
      return
    }

    setIsProcessingUrl(true)
    showNotification('Processing website...', 'processing')
    
    try {
      const formData = new FormData()
      formData.append('url', websiteUrl)

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken')
      const tokenType = localStorage.getItem('tokenType') || 'Bearer'

      const response = await fetch(`${API_BASE}/process/website`, {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${authToken}`
        },
        body: formData
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showNotification('Authentication failed. Please login again.', 'error')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.status === 'success') {
        showNotification(`Website processed successfully! Doc ID: ${result.doc_id}`, 'success')
        
        // Refresh the file list to show the newly processed URL
        await fetchFiles()
        setWebsiteUrl('') // Clear the input
        
      } else if (result.status === 'duplicate') {
        showNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'error')
        setWebsiteUrl('') // Clear the input
      } else {
        showNotification(`Error: ${result.message}`, 'error')
      }
    } catch (error) {
      showNotification(`Error processing website: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsProcessingUrl(false)
    }
  }

  const getFileTypeFromExtension = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return 'PDF'
      case 'docx':
      case 'doc':
        return 'DOCX'
      case 'txt':
        return 'TXT'
      case 'csv':
        return 'CSV'
      case 'xlsx':
      case 'xls':
        return 'XLSX'
      case 'ppt':
      case 'pptx':
        return 'PPT'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'IMAGE'
      default:
        return 'TXT'
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Check file type
    const extension = file.name.toLowerCase().split('.').pop()
    const supportedTypes = ['pdf', 'docx', 'doc', 'ppt', 'pptx']
    
    if (!supportedTypes.includes(extension || '')) {
      showNotification(`Unsupported file type: ${extension}. Supported types: PDF, DOCX, PPT`, 'error')
      return
    }

    setIsUploadingFile(true)
    showNotification(`Uploading ${file.name}...`, 'processing')
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken')
      const tokenType = localStorage.getItem('tokenType') || 'Bearer'

      const response = await fetch(`${API_BASE}/upload/file`, {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${authToken}`
        },
        body: formData
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showNotification('Authentication failed. Please login again.', 'error')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.status === 'success') {
        showNotification(`File uploaded successfully! Doc ID: ${result.doc_id}`, 'success')
        
        // Refresh the file list to show the newly uploaded file
        await fetchFiles()
        setSelectedFile(null)
        
      } else if (result.status === 'duplicate') {
        showNotification(`${result.message} (Doc ID: ${result.doc_id})`, 'error')
        setSelectedFile(null)
      } else {
        showNotification(`Error: ${result.message}`, 'error')
      }
    } catch (error) {
      showNotification(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      handleFileUpload(file)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      handleFileUpload(file)
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesType = typeFilter === "all" || file.type === typeFilter
    const matchesStatus = statusFilter === "all" || file.status === statusFilter
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const handleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return
    
    try {
      // Delete each selected file
      const deletePromises = selectedFiles.map(fileId => deleteFile(fileId))
      await Promise.all(deletePromises)
      
      // Clear selection after successful deletion
      setSelectedFiles([])
      showNotification(`${selectedFiles.length} file(s) deleted successfully`, 'success')
    } catch (error) {
      console.error('Error deleting selected files:', error)
      showNotification('Error deleting some files', 'error')
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

    setUploadPageChatHistory(prev => [...prev, newMessage])
    setChatMessage("")
    setIsChatLoading(true)

    try {
      // Get current chat history from sessionStorage (previous messages only)
      const storedChatHistory = getUploadPageChatHistory();
      
      console.log('UploadPage - Chat History being sent to backend:', storedChatHistory)

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
        setUploadPageChatHistory(prev => [...prev, botMessage])

        // After getting response, add BOTH user message and AI response to chat history
        const chatHistory = getUploadPageChatHistory();
        
        // Count existing user messages to get the next message number
        const userMessageCount = Object.keys(chatHistory).filter(key => key.startsWith('User_message_')).length;
        const nextMessageNumber = userMessageCount + 1;
        
        const userKey = `User_message_${nextMessageNumber}`;
        const aiKey = `AI_message_${nextMessageNumber}`;
        
        // Include file info in chat history if file was sent
        const historyUserMessage = uploadedChatFile 
          ? `File: ${uploadedChatFile.name} - ${userMessage}`
          : userMessage;
        
        updateUploadPageChatHistory(userKey, historyUserMessage);
        updateUploadPageChatHistory(aiKey, botResponse);
        
        // Clear the uploaded file after sending
        setUploadedChatFile(null);
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('UploadPage chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "vega",
        timestamp: new Date(),
      }
      setUploadPageChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    // Simply set the transcript in the input field - no auto-send
    setChatMessage(transcript)
  }

  // Clear chat history for upload page
  const clearUploadPageChat = () => {
    setUploadPageChatHistory([])
    setChatMessage("")
    clearUploadPageChatHistoryStorage()
  }

  // Mic toggle function for upload page chat
  const handleMicToggle = () => {
    if (!isRecordingUploadChat) {
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
    recognition.continuous = false // Let it stop automatically, but allow manual restart

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart
        } else {
          interimTranscript += transcriptPart
        }
      }
      
      // Update input field with both final and interim results
      const fullTranscript = finalTranscript + interimTranscript
      setChatMessage(fullTranscript)
      
      console.log("Upload page chat mic: Transcript update:", fullTranscript)
      
      // If we got a final transcript, keep the recognition running unless manually stopped
      if (finalTranscript && recognitionRef.current) {
        // Restart recognition to continue listening for more speech
        setTimeout(() => {
          if (recognitionRef.current && isRecordingUploadChat) {
            try {
              recognitionRef.current.start()
            } catch (error) {
              console.log("Recognition restart failed, probably already running")
            }
          }
        }, 100)
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error("Upload page chat mic: Speech recognition error:", event.error)
      // Only stop recording on certain errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsRecordingUploadChat(false)
        recognitionRef.current = null
      } else {
        // For other errors, try to restart if still recording
        setTimeout(() => {
          if (isRecordingUploadChat && recognitionRef.current) {
            try {
              recognitionRef.current.start()
            } catch (error) {
              console.log("Recognition restart after error failed")
              setIsRecordingUploadChat(false)
              recognitionRef.current = null
            }
          }
        }, 500)
      }
    }
    
    recognition.onend = () => {
      console.log("Upload page chat mic: Speech recognition ended")
      // Only stop if manually stopped, otherwise restart
      if (isRecordingUploadChat && recognitionRef.current) {
        setTimeout(() => {
          if (isRecordingUploadChat && recognitionRef.current) {
            try {
              recognitionRef.current.start()
            } catch (error) {
              console.log("Recognition restart failed, stopping")
              setIsRecordingUploadChat(false)
              recognitionRef.current = null
            }
          }
        }, 100)
      } else {
        setIsRecordingUploadChat(false)
      }
    }

    // Store recognition instance for manual stopping
    recognitionRef.current = recognition
    recognition.start()
    setIsRecordingUploadChat(true)
    console.log("Upload page chat mic: Speech recognition started")
  }

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecordingUploadChat(false)
    console.log("Upload page chat mic: Speech recognition manually stopped")
  }

  // Handle text file upload for chat
  const handleChatFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please select a .txt file only.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingChatFile(true);

    try {
      // Read file content
      const fileContent = await file.text();
      
      // Store the file content and name for later sending
      setUploadedChatFile({
        content: fileContent,
        name: file.name
      });

      toast({
        title: "File loaded",
        description: `${file.name} is ready to send. Type your message and click send.`,
      });

    } catch (error) {
      console.error('Chat file upload error:', error);
      
      toast({
        title: "Upload failed",
        description: "There was an error reading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingChatFile(false);
      // Clear the file input
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  // Handle chat file upload button click
  const handleChatFileUploadClick = () => {
    chatFileInputRef.current?.click();
  };

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [uploadPageChatHistory])

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current)
      }
      // Also cleanup recognition if still running
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="p-3 md:p-6 min-h-screen flex flex-col lg:flex-row gap-3 md:gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Upload Page</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Upload documents and process website URLs for Vega's knowledge base
            </p>
          </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Drag and drop files here or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center transition-colors cursor-pointer ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              } ${isUploadingFile ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {isUploadingFile ? (
                <>
                  <RefreshCw className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-base md:text-lg font-semibold mb-2">Uploading...</p>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    Please wait while we process your file
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-base md:text-lg font-semibold mb-2">Drop files here or click to browse</p>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    Supports PDF, DOCX, PPT files up to 10MB
                  </p>
                  <Button variant="neural" disabled={isUploadingFile} className="text-sm md:text-base">
                    {selectedFile ? (
                      <span className="truncate max-w-[200px] md:max-w-none">
                        {selectedFile.name}
                      </span>
                    ) : (
                      'Browse Files'
                    )}
                  </Button>
                </>
              )}
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.doc,.ppt,.pptx"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploadingFile}
              />
            </div>
          </CardContent>
        </Card>

        {/* URL Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Process Website
            </CardTitle>
            <CardDescription>
              Enter a website URL to extract and index its content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isProcessingUrl}
                  className="flex-1"
                />
                <Button 
                  onClick={handleProcessWebsite}
                  disabled={isProcessingUrl || !websiteUrl.trim()}
                  variant="neural"
                  className="w-full sm:w-auto shrink-0"
                >
                  {isProcessingUrl ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">Processing</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Process Website</span>
                      <span className="sm:hidden">Process</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-[10px]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Manage Files and URLs
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          fetchFiles()
                        }}
                        disabled={isLoadingFiles}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                        <span className="ml-1 hidden sm:inline">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh file list</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {selectedFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedFiles.length} selected
                    </Badge>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Delete Selected</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 sm:w-40">
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="PPT">PPT</SelectItem>
                  <SelectItem value="TXT">TXT</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="XLSX">XLSX</SelectItem>
                  <SelectItem value="URL">Website URLs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="indexed">Indexed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            {/* File List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 md:px-4 py-3 border-b flex items-center gap-2 md:gap-4 sticky top-0 z-10">
                <Checkbox
                  checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                  onCheckedChange={handleSelectAll}
                  className="shrink-0"
                />
                <span className="font-medium text-sm">File Name</span>
                <span className="font-medium text-sm ml-auto hidden md:inline">Status</span>
                <span className="font-medium text-sm ml-auto md:hidden">Actions</span>
              </div>
              
              {/* Custom Minimalistic Scrollable Area */}
              <div 
                className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-slate-600"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgb(148 163 184) transparent'
                }}
              >
                <div className="divide-y divide-border">
                  {isLoadingFiles ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                      <span className="text-muted-foreground">Loading files...</span>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="text-center p-8">
                      <p className="text-muted-foreground">No files found</p>
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto] gap-2 md:gap-4 p-3 md:p-4 hover:bg-muted/50 animate-fade-in items-center"
                      >
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => handleFileSelection(file.id)}
                          className="shrink-0"
                        />
                        
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          {getFileIcon(file.type)}
                          <div className="min-w-0 flex-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium truncate cursor-help text-sm md:text-base">{file.name}</p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="break-all">{file.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {file.size} • {file.uploadDate.toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Status badge - hidden on mobile, shown on md+ */}
                        <div className="hidden md:flex">
                          {getStatusBadge(file.status)}
                        </div>

                        {/* Actions - always visible but compact on mobile */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Status badge on mobile - smaller */}
                          <div className="md:hidden">
                            {getStatusBadge(file.status)}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => deleteFile(file.id)}
                                  className="text-destructive hover:text-destructive h-8 w-8 md:h-10 md:w-10"
                                >
                                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete file</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Toggle Button */}
      {!isChatOpen && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes triplePulse {
                0%, 10%, 20%, 30%, 40%, 100% {
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
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Open Chat</p>
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
                    <MessageCircle className="w-5 h-5" />
                    Test Knowledge Base
                  </CardTitle>
                  <CardDescription>
                    Ask questions about your uploaded documents
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearUploadPageChat}
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
                  {uploadPageChatHistory.length === 0 ? (
                    <div className="text-muted-foreground text-center flex items-center justify-center h-full">
                      <div>
                        <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Start a conversation to test your knowledge base</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {uploadPageChatHistory.map((message) => (
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
                    variant={isRecordingUploadChat ? "destructive" : "outline"}
                    size="icon"
                    onClick={handleMicToggle}
                    className={isRecordingUploadChat ? "bg-destructive text-destructive-foreground" : ""}
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
                    placeholder="Ask about your documents..."
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
                  Files ingested. Vega will reference them in new chats.
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