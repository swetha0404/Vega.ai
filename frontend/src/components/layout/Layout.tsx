import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext"

interface LayoutProps {
  userRole?: "user" | "admin"
}

function LayoutContent({ userRole }: LayoutProps) {
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar userRole={userRole} />
      <main 
        className={`overflow-auto transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}

export function Layout({ userRole = "user" }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent userRole={userRole} />
    </SidebarProvider>
  )
}