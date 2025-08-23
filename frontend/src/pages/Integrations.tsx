import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Chrome,
  Briefcase,
  Mail,
  Calendar,
  FileText,
  Database
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const integrations = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Gmail, Drive, Calendar, and Docs integration",
    icon: Chrome,
    status: "connected",
    color: "text-blue-600"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM data and customer relationship management",
    icon: Briefcase,
    status: "needs-attention",
    color: "text-blue-500"
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Outlook, OneDrive, and Office apps",
    icon: Mail,
    status: "connected",
    color: "text-blue-700"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and workspace data",
    icon: MessageCircle,
    status: "connected",
    color: "text-purple-600"
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project management and issue tracking",
    icon: FileText,
    status: "disconnected",
    color: "text-blue-600"
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Knowledge base and documentation",
    icon: Database,
    status: "connected",
    color: "text-blue-600"
  }
]

function MessageCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.486 2 2 6.486 2 12c0 1.48.36 2.92 1.023 4.228L2 22l5.772-1.023A9.93 9.93 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2z"/>
    </svg>
  )
}

export default function Integrations() {
  const navigate = useNavigate()
  const [userName] = useState(localStorage.getItem("userName") || "User")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )
      case "needs-attention":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Attention
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Disconnected
          </Badge>
        )
      default:
        return null
    }
  }

  const handleOpenIntegration = (integrationId: string) => {
    navigate(`/integrations/${integrationId}`)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          Choose an integration to start your AI-assisted workflow
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon
          
          return (
            <Card 
              key={integration.id}
              className="group hover:shadow-neural transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-card border-border"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${integration.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {integration.name}
                      </CardTitle>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button
                  variant="integration"
                  className="w-full"
                  onClick={() => handleOpenIntegration(integration.id)}
                  disabled={integration.status === "disconnected"}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {integration.status === "disconnected" ? "Configure" : "Open"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
              Active Integrations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-success">
              {integrations.filter(i => i.status === "connected").length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
              Need Attention
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-warning">
              {integrations.filter(i => i.status === "needs-attention").length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Available
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {integrations.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}