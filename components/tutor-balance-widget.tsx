"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { DollarSign, TrendingUp, Clock } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { CreatePayoutDialog } from "@/components/create-payout-dialog"

interface TutorBalanceWidgetProps {
  tutorId: string
}

export function TutorBalanceWidget({ tutorId }: TutorBalanceWidgetProps) {
  const [balance, setBalance] = useState(0)
  const [weeklyEarnings, setWeeklyEarnings] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalance()
  }, [tutorId])

  async function loadBalance() {
    try {
      const supabase = createBrowserClient()

      // Загружаем заработок репетитора (500₽ за каждый проведенный урок)
      const { data: earnings } = await supabase.from("tutor_earnings").select("amount, status").eq("tutor_id", tutorId)

      const totalEarned =
        earnings?.filter((e) => e.status === "earned").reduce((sum, e) => sum + Number(e.amount), 0) || 0
      const totalPaid = earnings?.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0) || 0

      // Баланс = заработано - выплачено
      const currentBalance = totalEarned - totalPaid

      // Заработок за текущую неделю
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const { data: weekEarnings } = await supabase
        .from("tutor_earnings")
        .select("amount")
        .eq("tutor_id", tutorId)
        .eq("status", "earned")
        .gte("created_at", weekStart.toISOString())

      const weekTotal = weekEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

      // Ожидающие выплаты
      const { data: payouts } = await supabase
        .from("salary_payments")
        .select("amount")
        .eq("user_id", tutorId)
        .eq("status", "pending")

      const pendingTotal = payouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      setBalance(currentBalance)
      setWeeklyEarnings(weekTotal)
      setPendingPayouts(pendingTotal)
    } catch (error) {
      console.error("[v0] Error loading balance:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-emerald-100 to-green-100 p-3">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">Баланс на сайте</p>
              <p className="text-3xl font-bold text-emerald-900">{balance.toFixed(0)} ₽</p>
            </div>
          </div>
          <CreatePayoutDialog tutorId={tutorId} availableBalance={balance} onPayoutCreated={loadBalance} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/60 p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-green-700">За эту неделю</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{weeklyEarnings.toFixed(0)} ₽</p>
          </div>

          <div className="rounded-lg bg-white/60 p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-700">В ожидании</p>
            </div>
            <p className="text-2xl font-bold text-orange-900">{pendingPayouts.toFixed(0)} ₽</p>
          </div>
        </div>

        <div className="rounded-lg bg-emerald-100/50 p-4 border border-emerald-200">
          <p className="text-xs text-emerald-700 font-medium mb-2">💡 Как работают выплаты:</p>
          <ul className="text-xs text-emerald-600 space-y-1">
            <li>• За каждый проведенный урок начисляется 500₽</li>
            <li>• Выплаты можно запрашивать раз в неделю</li>
            <li>• ГА рассматривает заявку и одобряет выплату</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
