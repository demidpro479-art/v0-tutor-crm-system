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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function UserMenu() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        // Получаем дополнительную информацию о пользователе
        const { data: userData } = await supabase.from("users").select("*").eq("auth_user_id", user.id).single()

        setUser({ ...user, ...userData })
      }
    } catch (error) {
      console.error("Error loading user:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success("Вы успешно вышли из системы")
      router.push("/auth/sign-in")
      router.refresh()
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Ошибка при выходе из системы")
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    )
  }

  if (!user) return null

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name || user.email} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.full_name || "Пользователь"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Настройки</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
          disabled={loggingOut}
        >
          {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
