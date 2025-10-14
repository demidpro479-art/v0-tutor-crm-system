"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Shield, UserCog, GraduationCap, Briefcase, User, ChevronDown, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Role {
  role: string
}

const roleConfig = {
  super_admin: {
    label: "Главный Администратор",
    icon: Shield,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    path: "/admin",
  },
  admin: {
    label: "Администратор",
    icon: UserCog,
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
    path: "/admin",
  },
  tutor: {
    label: "Репетитор",
    icon: GraduationCap,
    color: "bg-gradient-to-r from-green-500 to-emerald-500",
    path: "/tutor",
  },
  manager: {
    label: "Менеджер",
    icon: Briefcase,
    color: "bg-gradient-to-r from-orange-500 to-amber-500",
    path: "/manager",
  },
  student: {
    label: "Ученик",
    icon: User,
    color: "bg-gradient-to-r from-indigo-500 to-purple-500",
    path: "/student",
  },
}

export function RoleSwitcher() {
  const [roles, setRoles] = useState<Role[]>([])
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (userError || !userData) {
        console.error("User not found in users table:", userError)
        return
      }

      const userId = userData.id

      // Получаем все роли пользователя
      const { data: userRoles, error: rolesError } = await supabase.rpc("get_user_roles", {
        p_user_id: userId,
      })

      if (rolesError) throw rolesError

      setRoles(userRoles || [])

      // Получаем активную роль
      const { data: activeRoleData, error: activeError } = await supabase.rpc("get_active_role", {
        p_user_id: userId,
      })

      if (activeError) throw activeError

      setActiveRole(activeRoleData)
    } catch (error) {
      console.error("Error loading roles:", error)
      toast.error("Ошибка загрузки ролей")
    } finally {
      setLoading(false)
    }
  }

  async function switchRole(newRole: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (userError || !userData) {
        console.error("User not found in users table:", userError)
        return
      }

      const { error } = await supabase.rpc("switch_active_role", {
        p_user_id: userData.id,
        p_new_role: newRole,
      })

      if (error) throw error

      setActiveRole(newRole)
      toast.success(`Переключено на роль: ${roleConfig[newRole as keyof typeof roleConfig].label}`)

      // Перенаправляем на соответствующую страницу
      router.push(roleConfig[newRole as keyof typeof roleConfig].path)
      router.refresh()
    } catch (error) {
      console.error("Error switching role:", error)
      toast.error("Ошибка переключения роли")
    }
  }

  if (loading || roles.length <= 1) return null

  const currentRoleConfig = activeRole ? roleConfig[activeRole as keyof typeof roleConfig] : null
  const CurrentIcon = currentRoleConfig?.icon || User

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-2 hover:border-primary transition-all bg-transparent">
          <div className={`p-1.5 rounded-lg ${currentRoleConfig?.color || "bg-muted"}`}>
            <CurrentIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium">{currentRoleConfig?.label || "Выберите роль"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Переключение ролей</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const config = roleConfig[role.role as keyof typeof roleConfig]
          const Icon = config.icon
          const isActive = role.role === activeRole

          return (
            <DropdownMenuItem
              key={role.role}
              onClick={() => switchRole(role.role)}
              className="gap-3 cursor-pointer py-3"
            >
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{config.label}</div>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
