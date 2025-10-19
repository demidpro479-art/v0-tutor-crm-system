"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, BarChart3, Users, Settings, LogOut } from "lucide-react"
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

    // Для ГА, менеджера и репетитора добавляем расписание и статистику
    if (userRole === "admin" || userRole === "manager" || userRole === "tutor") {
      baseNav.push(
        { name: "Расписание", href: "/calendar", icon: Calendar },
        { name: "Статистика", href: "/statistics", icon: BarChart3 },
      )
    }

    // Только для ГА добавляем пользователей и настройки
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
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-slate-800">
        <h1 className="text-xl font-bold">PySchool CRM</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </Button>
      </div>
    </div>
  )
}
