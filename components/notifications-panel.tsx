"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, X, Check, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  student_id: string
  message: string
  is_read: boolean
  created_at: string
  expires_at: string
}

interface NotificationsPanelProps {
  onRefillConfirmed?: () => void
}

export function NotificationsPanel({ onRefillConfirmed }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Обновляем уведомления каждые 30 секунд
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("lesson_refill_notifications")
        .select("*")
        .eq("is_read", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error)
    }
  }

  async function markAsRead(notificationId: string) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("lesson_refill_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)

      if (error) throw error
      fetchNotifications()
    } catch (error) {
      console.error("Ошибка обновления уведомления:", error)
    }
  }

  async function handleRefillConfirmed(studentId: string, notificationId: string) {
    setLoading(true)
    const supabase = createClient()

    try {
      // Вызываем функцию обновления расписания после пополнения
      const { data, error } = await supabase.rpc("update_schedule_after_refill", {
        p_student_id: studentId,
      })

      if (error) throw error

      console.log(`Создано ${data} новых уроков после пополнения`)

      // Помечаем уведомление как прочитанное
      await markAsRead(notificationId)

      // Уведомляем родительский компонент
      onRefillConfirmed?.()
    } catch (error) {
      console.error("Ошибка обновления расписания:", error)
    } finally {
      setLoading(false)
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Bell className="h-5 w-5" />
          Уведомления о пополнении уроков
          <Badge variant="secondary" className="bg-orange-200 text-orange-800">
            {notifications.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start justify-between p-3 bg-white rounded-lg border border-orange-200"
          >
            <div className="flex-1">
              <p className="text-sm text-gray-700">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.created_at).toLocaleString("ru-RU", {
                  timeZone: "Asia/Yekaterinburg",
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleRefillConfirmed(notification.student_id, notification.id)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Пополнено
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
