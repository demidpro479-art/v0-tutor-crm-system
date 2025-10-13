"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, DollarSign, TrendingUp } from "lucide-react"

interface ManagerEarningsHistoryProps {
  managerId: string
}

export function ManagerEarningsHistory({ managerId }: ManagerEarningsHistoryProps) {
  const [earnings, setEarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEarnings()
  }, [managerId])

  async function loadEarnings() {
    setLoading(true)
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from("manager_salaries")
      .select("*")
      .eq("manager_id", managerId)
      .order("week_start", { ascending: false })
      .limit(10)

    setEarnings(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (earnings.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">История заработка пока пуста</p>
        <p className="text-sm text-gray-500 mt-2">Заработок начисляется еженедельно: 500₽ + 5% от продаж</p>
      </div>
    )
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.total_salary, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-3">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Всего заработано</p>
            <p className="text-3xl font-bold text-green-900">{totalEarnings.toFixed(0)} ₽</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {earnings.map((earning) => (
          <div
            key={earning.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-all duration-200"
          >
            <div>
              <p className="font-semibold text-gray-900">
                Неделя {new Date(earning.week_start).toLocaleDateString("ru-RU")}
              </p>
              <div className="mt-1 flex gap-4 text-sm text-gray-600">
                <span>Продажи: {earning.sales_amount} ₽</span>
                <span>•</span>
                <span>Комиссия: {earning.commission} ₽</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Итого</p>
              <p className="text-2xl font-bold text-green-600">{earning.total_salary} ₽</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
