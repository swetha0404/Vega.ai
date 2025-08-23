import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  UserPlus,
  Shield,
  User,
  Mail,
  Calendar,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/utils/api"

interface User {
  username: string
  email: string | null
  role: "user" | "admin"
  is_active: boolean
  created_at: string
  last_login: string | null
  // Computed properties for UI compatibility
  id?: string
  status?: "active" | "inactive"
  createdDate?: Date
  lastLogin?: Date | null
}

// Transform backend user data to UI format
const transformUser = (backendUser: any): User => ({
  username: backendUser.username,
  email: backendUser.email,
  role: backendUser.role,
  is_active: backendUser.is_active,
  created_at: backendUser.created_at,
  last_login: backendUser.last_login,
  // Computed properties for UI compatibility
  id: backendUser.username,
  status: backendUser.is_active ? "active" : "inactive",
  createdDate: new Date(backendUser.created_at),
  lastLogin: backendUser.last_login ? new Date(backendUser.last_login) : null
})

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin"
  })
  const [editUser, setEditUser] = useState({
    email: "",
    password: "",
    role: "user" as "user" | "admin",
    is_active: true
  })

  // Load users from backend
  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.fetchWithAuth('/users')
      if (response.ok) {
        const usersData = await response.json()
        // Convert object to array if needed and transform to UI format
        const usersArray = Array.isArray(usersData) 
          ? usersData 
          : Object.values(usersData)
        
        const transformedUsers = usersArray.map(transformUser)
        setUsers(transformedUsers)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      // Fallback to empty array on error
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter  
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted">
            Inactive
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted">
            Unknown
          </Badge>
        )
    }
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        User
      </Badge>
    )
  }

  const handleCreateUser = async () => {
    try {
      const response = await api.fetchWithAuth('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        })
      })

      if (response.ok) {
        const createdUser = await response.json()
        const transformedUser = transformUser(createdUser)
        setUsers(prev => [...prev, transformedUser])
      }
    } catch (error) {
      console.error('Failed to create user:', error)
    }
    
    setNewUser({ username: "", email: "", password: "", role: "user" })
    setShowCreateModal(false)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditUser({
      email: user.email || "",
      password: "", // Start with empty password - user can optionally change it
      role: user.role,
      is_active: user.is_active
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    try {
      // Only include password in the update if it's provided
      const updateData: any = {
        email: editUser.email,
        role: editUser.role,
        is_active: editUser.is_active
      }
      
      // Add password only if user entered one
      if (editUser.password && editUser.password.trim() !== "") {
        updateData.password = editUser.password
      }
      
      const response = await api.fetchWithAuth(`/users/${editingUser.username}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedUser = await response.json()
        const transformedUser = transformUser(updatedUser)
        setUsers(prev => 
          prev.map(u => u.username === editingUser.username ? transformedUser : u)
        )
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
    
    setShowEditModal(false)
    setEditingUser(null)
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return
    }
    
    try {
      const response = await api.fetchWithAuth(`/users/${user.username}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const getInitials = (username: string) => {
    return username.split('.').map(part => part[0]).join('').toUpperCase()
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Command Crew</h1>
          <p className="text-muted-foreground">
            Manage team members and their access levels
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button variant="neural">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new team member to Vega.ai
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="john.doe"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: "user" | "admin") => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="neural" onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editingUser?.username || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@company.com"
                  value={editUser.email}
                  onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave empty to keep current password"
                  value={editUser.password}
                  onChange={(e) => setEditUser(prev => ({ ...prev, password: e.target.value }))}
                />
                {/* <p className="text-xs text-muted-foreground mt-1">Leave empty to keep current password</p> */}
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editUser.role} onValueChange={(value: "user" | "admin") => setEditUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editUser.is_active ? "active" : "inactive"} onValueChange={(value) => setEditUser(prev => ({ ...prev, is_active: value === "active" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="neural" onClick={handleUpdateUser}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Total Users
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {users.length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Active
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-success">
              {users.filter(u => u.status === "active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Admins
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {users.filter(u => u.role === "admin").length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Inactive
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-warning">
              {users.filter(u => u.status === "inactive").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-slate-600"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgb(148 163 184) transparent'
                }}
              >
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 border-b">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="animate-fade-in">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status || "inactive")}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {user.createdDate.toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {user.lastLogin.toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              {users.length === 0 ? (
                // No users in the system at all
                <>
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users yet</h3>
                  <p className="text-muted-foreground mb-4">Invite your first teammate to get started</p>
                  <Button variant="neural" onClick={() => setShowCreateModal(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </>
              ) : (
                // Users exist but none match the current filters
                <>
                  <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users match your criteria</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search term or filters to find the users you're looking for
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("")
                        setRoleFilter("all")
                        setStatusFilter("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                    {/* <Button variant="neural" onClick={() => setShowCreateModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite User
                    </Button> */}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}