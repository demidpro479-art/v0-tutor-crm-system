"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit, Shield, GraduationCap, Briefcase } from "lucide-react"

interface User {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const { toast } = useToast()

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "tutor":
        return <GraduationCap className="h-4 w-4" />
      case "manager":
        return <Briefcase className="h-4 w-4" />
      default:
        return null
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор"
      case "tutor":
        return "Репетитор"
      case "manager":
        return "Менеджер"
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "tutor":
        return "default"
      case "manager":
        return "secondary"
      default:
        return "outline"
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Пользователь удален",
      })

      window.location.reload()
    } catch (error) {
      console.error("Ошибка удаления пользователя:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Все пользователи ({users.length})</h3>
        </div>

        <div className="grid gap-3">
          {users.map((user) => (
            <Card key={user.id} className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-slate-900">{user.full_name}</h4>
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <Badge variant={getRoleColor(user.role)} className="mt-1 text-xs gap-1">
                      {getRoleIcon(user.role)}
                      {getRoleText(user.role)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  )
}
