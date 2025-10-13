"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { DollarSign, TrendingUp, Clock, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface EarningsStats {
  total_earned: number
  total_paid: number
  total_pending: number
  total_rejected: number
  balance: number
}

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  description: string
  created_at: string
  status: string
}

export function TutorEarningsOverview({ tutorId }: { tutorId: string }) {
  const [stats, setStats] = useState<EarningsStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tutorId])

  async function loadData() {
    try {
      // Загружаем статистику
      const { data: statsData, error: statsError } = await supabase.rpc("get_tutor_payment_stats", {
        p_tutor_id: tutorId,
      })

      if (statsError) throw statsError
      setStats(statsData)

      // Загружаем последние транзакции
      const { data: transData, error: transError } = await supabase
        .from("transaction_history")
        .select("*")
        .eq("user_id", tutorId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (transError) throw transError
      setTransactions(transData || [])
    } catch (error) {
      console.error("Error loading earnings data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: "Всего заработано",
      value: `${stats.total_earned.toFixed(2)} ₽`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Выплачено",
      value: `${stats.total_paid.toFixed(2)} ₽`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "В ожидании",
      value: `${stats.total_pending.toFixed(2)} ₽`,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Отклонено",
      value: `${stats.total_rejected.toFixed(2)} ₽`,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Баланс */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Текущий баланс</p>
            <p className="text-3xl font-bold mt-2 text-purple-600">{stats.balance.toFixed(2)} ₽</p>
            <p className="text-sm text-muted-foreground mt-1">Заработано - Выплачено</p>
          </div>
        </div>
      </Card>

      {/* История транзакций */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">История транзакций</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет транзакций</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(transaction.created_at).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {transaction.amount >= 0 ? "+" : ""}
                    {transaction.amount.toFixed(2)} ₽
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {transaction.status === "completed"
                      ? "Завершено"
                      : transaction.status === "cancelled"
                        ? "Отменено"
                        : "В обработке"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
