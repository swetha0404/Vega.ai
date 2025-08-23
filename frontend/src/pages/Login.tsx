import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Brain } from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import vegaLogo from "@/assets/vega-logo.png"
import { api } from "@/utils/api"
import { auth } from "@/utils/auth"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Call the real backend API
      const loginResponse = await api.login({ username, password })
      
      // Store authentication data
      auth.storeLoginData(loginResponse)
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${loginResponse.user.username}!`,
      })
      
      // Redirect based on role
      if (loginResponse.user.role === 'admin') {
        navigate("/integrations")
      } else {
        navigate("/integrations")
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle p-4 relative">
      {/* Theme Toggle - Fixed position in top-right corner */}
      <div className="fixed top-4 right-4 z-[1000]">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md shadow-neural animate-fade-in">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={vegaLogo} 
                alt="Vega.ai" 
                className="w-16 h-16"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-mono">
              Welcome to Vega.ai
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your AI Support Assistant
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              variant="neural"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Secured by PingFederate
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}