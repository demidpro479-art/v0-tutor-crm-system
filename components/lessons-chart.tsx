"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface LessonStats {
  status: string
  count: number
  percentage: number
}

export function LessonsChart() {
  const [statusData, setStatusData] = useState<LessonStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLessonsData()
  }, [])

  async function fetchLessonsData() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.from("lessons").select("status")

      if (error) throw error

      // Подсчитываем статистику по статусам
      const statusCounts: { [key: string]: number } = {}
      const total = data?.length || 0

      data?.forEach((lesson) => {
        statusCounts[lesson.status] = (statusCounts[lesson.status] || 0) + 1
      })

      const statusLabels: { [key: string]: string } = {
        scheduled: "Запланированы",
        completed: "Проведены",
        cancelled: "Отменены",
        missed: "Пропущены",
      }

      const colors = {
        scheduled: "#3b82f6",
        completed: "#10b981",
        cancelled: "#ef4444",
        missed: "#f59e0b",
      }

      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[status as keyof typeof colors] || "#6b7280",
      }))

      setStatusData(chartData)
    } catch (error) {
      console.error("Ошибка загрузки данных об уроках:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика уроков</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика уроков</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ status, percentage }) => `${status}: ${percentage}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, "Количество"]} />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {statusData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">
                {item.status}: {item.count} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
