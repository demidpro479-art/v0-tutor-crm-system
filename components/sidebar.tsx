"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, BarChart3, Users, Settings, LogOut, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getNavigation = () => {
    const baseNav = [{ name: "Дашборд", href: "/dashboard", icon: LayoutDashboard }]

    if (userRole === "admin" || userRole === "manager" || userRole === "tutor") {
      baseNav.push(
        { name: "Расписание", href: "/calendar", icon: Calendar },
        { name: "Статистика", href: "/statistics", icon: BarChart3 },
      )
    }

    if (userRole === "admin") {
      baseNav.push(
        { name: "Пользователи", href: "/users", icon: Users },
        { name: "Настройки", href: "/settings", icon: Settings },
      )
    }

    return baseNav
  }

  const navigation = getNavigation()

  return (
    <div className="flex h-full w-64 flex-col glass-effect dark:glass-effect-dark border-r">
      <div className="flex h-20 items-center justify-center border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              PySchool
            </h1>
            <p className="text-xs text-muted-foreground">Premium CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border/50 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 font-semibold hover:bg-destructive/10 hover:text-destructive transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </Button>
      </div>
    </div>
  )
}
