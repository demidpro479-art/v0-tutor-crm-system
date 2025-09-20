"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface AutoScheduleUpdaterProps {
  onScheduleUpdated?: () => void
}

export function AutoScheduleUpdater({ onScheduleUpdated }: AutoScheduleUpdaterProps) {
  useEffect(() => {
    const supabase = createClient()

    // Подписываемся на изменения в таблице students (пополнение уроков)
    const channel = supabase
      .channel("students-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "students",
          filter: "remaining_lessons=gt.0",
        },
        async (payload) => {
          console.log("[v0] Обнаружено пополнение уроков у ученика:", payload.new)

          // Автоматически обновляем расписание для этого ученика
          try {
            const { data, error } = await supabase.rpc("update_schedule_after_refill", {
              p_student_id: payload.new.id,
            })

            if (error) {
              console.error("Ошибка автообновления расписания:", error)
            } else {
              console.log(`[v0] Автоматически создано ${data} новых уроков`)
              onScheduleUpdated?.()
            }
          } catch (error) {
            console.error("Ошибка автообновления расписания:", error)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onScheduleUpdated])

  return null // Этот компонент не рендерит ничего видимого
}
