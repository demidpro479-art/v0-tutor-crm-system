"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface MonthlyRevenue {
  month: string
  revenue: number
  lessons: number
}

export function RevenueChart() {
  const [data, setData] = useState<MonthlyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  async function fetchRevenueData() {
    const supabase = createClient()

    try {
      // Получаем данные за последние 12 месяцев
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .gte("payment_date", startDate.toISOString())
        .order("payment_date")

      if (paymentsError) throw paymentsError

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("scheduled_at, status")
        .eq("status", "completed")
        .gte("scheduled_at", startDate.toISOString())
        .order("scheduled_at")

      if (lessonsError) throw lessonsError

      // Группируем данные по месяцам
      const monthlyData: { [key: string]: { revenue: number; lessons: number } } = {}

      // Инициализируем все месяцы
      for (let i = 0; i < 12; i++) {
        const date = new Date()
        date.setMonth(date.getMonth() - 11 + i)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
        monthlyData[key] = { revenue: 0, lessons: 0 }
      }

      // Добавляем данные о платежах
      paymentsData?.forEach((payment) => {
        const date = new Date(payment.payment_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        if (monthlyData[key]) {
          monthlyData[key].revenue += payment.amount
        }
      })

      // Добавляем данные об уроках
      lessonsData?.forEach((lesson) => {
        const date = new Date(lesson.scheduled_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        if (monthlyData[key]) {
          monthlyData[key].lessons += 1
        }
      })

      // Преобразуем в массив для графика
      const chartData = Object.entries(monthlyData).map(([key, values]) => {
        const [year, month] = key.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
        const monthName = date.toLocaleDateString("ru-RU", { month: "short" })

        return {
          month: monthName,
          revenue: values.revenue,
          lessons: values.lessons,
        }
      })

      setData(chartData)
    } catch (error) {
      console.error("Ошибка загрузки данных о доходах:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Доходы по месяцам</CardTitle>
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
        <CardTitle>Доходы по месяцам</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === "revenue" ? `₽${value}` : value,
                name === "revenue" ? "Доход" : "Уроки",
              ]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
