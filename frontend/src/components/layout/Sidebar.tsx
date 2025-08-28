import { useState, useEffect } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { 
  Brain, 
  Grid3X3, 
  MessageCircle, 
  Upload, 
  Users, 
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { cn } from "@/lib/utils"
import vegaLogo from "@/assets/vega-logo.png"
import { auth } from "@/utils/auth"
import { useSidebar } from "@/contexts/SidebarContext"

const navigationItems = [
  {
    title: "Integrations Bay",
    url: "/integrations",
    icon: Grid3X3,
    roles: ["user", "admin"]
  },
  // {
  //   title: "Neural Console", 
  //   url: "/chat",
  //   icon: MessageCircle,
  //   roles: ["user", "admin"]
  // },
  {
    title: "IAM Dashboard",
    url: "/iam-dashboard",
    icon: Shield,
    roles: ["user", "admin"]
  },
  {
    title: "Data Uplink",
    url: "/upload", 
    icon: Upload,
    roles: ["admin"]
  },
  {
    title: "Command Crew",
    url: "/users",
    icon: Users,
    roles: ["admin"]
  }
]

interface SidebarProps {
  userRole?: "user" | "admin"
}

export function Sidebar({ userRole = "user" }: SidebarProps) {
  const { collapsed, setCollapsed } = useSidebar()
  const [currentUserRole, setCurrentUserRole] = useState<"user" | "admin">(userRole)
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  
  // Ensure we have the correct user role with fallback
  useEffect(() => {
    try {
      const user = auth.getCurrentUser()
      const role = user?.role as "user" | "admin"
      setCurrentUserRole(role || userRole || "user")
    } catch (error) {
      console.error("Failed to get user role:", error)
      setCurrentUserRole(userRole || "user")
    } finally {
      setIsLoading(false)
    }
  }, [userRole])
  
  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(currentUserRole)
  )
  
  const isActive = (path: string) => location.pathname === path
  
  const handleLogout = () => {
    try {
      auth.logout()
      navigate('/login')
    } catch (error) {
      console.error("Logout failed:", error)
      // Force navigation even if logout fails
      navigate('/login')
    }
  }
  
  // Show loading state briefly to prevent flash
  if (isLoading) {
    return (
      <div 
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={vegaLogo} 
                alt="Vega.ai" 
                className="w-8 h-8"
              />
            </div>
            {!collapsed && (
              <div className="animate-pulse">
                <div className="h-5 bg-sidebar-accent rounded w-20 mb-1"></div>
                <div className="h-3 bg-sidebar-accent rounded w-16"></div>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-sidebar-accent rounded-lg"></div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    )
  }
  
  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={vegaLogo} 
              alt="Vega.ai" 
              className="w-8 h-8"
            />
          </div>
          {!collapsed && (
            <div className="animate-slide-in">
              <h1 className="text-lg font-mono font-bold text-sidebar-foreground">
                Vega.ai
              </h1>
              <p className="text-xs text-sidebar-foreground/60">
                AI Support Assistant
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.url)
            
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={({ isActive }) => 
                  cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-neural" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="font-medium animate-slide-in">
                    {item.title}
                  </span>
                )}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neural-glow" />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">
              Theme
            </span>
            <ThemeToggle />
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
    </div>
  )
}