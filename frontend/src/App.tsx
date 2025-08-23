import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import Login from "./pages/Login";
import Integrations from "./pages/Integrations";
import IntegrationWorkspace from "./pages/IntegrationWorkspace";
import NeuralConsole from "./pages/NeuralConsole";
import UploadPage from "./pages/UploadPage";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import { auth } from "./utils/auth";

const queryClient = new QueryClient();

// Auth guard component with proper user role handling
const ProtectedRoute = () => {
  const [userRole, setUserRole] = useState<"user" | "admin">("user");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuthenticated = auth.isAuthenticated();
        if (isAuthenticated) {
          const user = auth.getCurrentUser();
          const role = user?.role as "user" | "admin";
          setUserRole(role || "user");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUserRole("user");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const isAuthenticated = auth.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return <Layout userRole={userRole} />;
};

// Admin route guard
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = auth.isAuthenticated();
  const isAdmin = auth.isAdmin();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return isAdmin ? <>{children}</> : <Navigate to="/integrations" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/integrations" replace />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/integrations/:app" element={<IntegrationWorkspace />} />
            <Route path="/chat" element={<NeuralConsole />} />
            <Route path="/upload" element={
              <AdminRoute>
                <UploadPage />
              </AdminRoute>
            } />
            <Route path="/users" element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
