"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, Users, Receipt } from "lucide-react"
import { AddPaymentDialog } from "@/components/add-payment-dialog"
import { PaymentsHistory } from "@/components/payments-history"
import { Loader2 } from "lucide-react"
import { AllStudentsList } from "@/components/all-students-list"
import { ManagerEarningsHistory } from "@/components/manager-earnings-history"

interface ManagerDashboardProps {
  userId: string
}

export function ManagerDashboard({ userId }: ManagerDashboardProps) {
  const [stats, setStats] = useState({
    weekSales: 0,
    totalStudents: 0,
    pendingPayments: 0,
    weekEarnings: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  async function loadStats() {
    setLoading(true)
    const supabase = createBrowserClient()

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .gte("created_at", weekStart.toISOString())

    const weekSales = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

    const { data: operations } = await supabase
      .from("manager_operations")
      .select("amount, manager_commission")
      .eq("manager_id", userId)
      .gte("created_at", weekStart.toISOString())

    const weekCommissions = operations?.reduce((sum, op) => sum + Number(op.manager_commission || 0), 0) || 0
    const weekEarnings = 500 + weekCommissions

    const { count: studentsCount } = await supabase
      .from("profiles")
      .select("*", { count: "only", head: true })
      .eq("role", "student")

    const { count: pendingCount } = await supabase
      .from("manager_operations")
      .select("*", { count: "only", head: true })
      .eq("status", "pending")

    setStats({
      weekSales,
      totalStudents: studentsCount || 0,
      pendingPayments: pendingCount || 0,
      weekEarnings,
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-900 to-blue-900 bg-clip-text text-transparent">
              Панель Менеджера
            </h1>
            <p className="mt-2 text-gray-600">Управление платежами и работа с клиентами</p>
          </div>
          <AddPaymentDialog onPaymentAdded={loadStats} managerId={userId} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Продажи за неделю</p>
                <p className="text-3xl font-bold text-green-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${stats.weekSales} ₽`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Заработок за неделю</p>
                <p className="text-3xl font-bold text-blue-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${stats.weekEarnings.toFixed(0)} ₽`}
                </p>
                <p className="text-xs text-blue-600 mt-1">500₽ + комиссия от операций</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Всего учеников</p>
                <p className="text-3xl font-bold text-purple-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.totalStudents}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Ожидают оплаты</p>
                <p className="text-3xl font-bold text-orange-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.pendingPayments}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Платежи
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Мой заработок
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <PaymentsHistory managerId={userId} />
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="p-6 bg-gradient-to-br from-white to-slate-50">
              <h3 className="mb-4 text-lg font-semibold">Все ученики</h3>
              <AllStudentsList />
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="p-6 bg-gradient-to-br from-white to-slate-50">
              <h3 className="mb-4 text-lg font-semibold">История заработка</h3>
              <ManagerEarningsHistory managerId={userId} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
