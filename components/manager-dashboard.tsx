"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, Users, Receipt } from "lucide-react"
import { AddPaymentDialog } from "@/components/add-payment-dialog"
import { PaymentsHistory } from "@/components/payments-history"

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

  useEffect(() => {
    loadStats()
  }, [userId])

  async function loadStats() {
    const supabase = createBrowserClient()

    // Get week start date
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    // Get week sales
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("manager_id", userId)
      .gte("created_at", weekStart.toISOString())

    const weekSales = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // Calculate earnings: 500 + 5% of sales
    const weekEarnings = 500 + weekSales * 0.05

    // Get total students
    const { count: studentsCount } = await supabase.from("students").select("*", { count: "only", head: true })

    // Get pending payments
    const { count: pendingCount } = await supabase
      .from("payments")
      .select("*", { count: "only", head: true })
      .eq("status", "pending")

    setStats({
      weekSales,
      totalStudents: studentsCount || 0,
      pendingPayments: pendingCount || 0,
      weekEarnings,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель Менеджера</h1>
            <p className="text-gray-600">Управление платежами и клиентами</p>
          </div>
          <AddPaymentDialog onPaymentAdded={loadStats} managerId={userId} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Продажи за неделю</p>
                <p className="text-2xl font-bold">{stats.weekSales} ₽</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Заработок за неделю</p>
                <p className="text-2xl font-bold">{stats.weekEarnings.toFixed(0)} ₽</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего учеников</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ожидают оплаты</p>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">Платежи</TabsTrigger>
            <TabsTrigger value="students">Ученики</TabsTrigger>
            <TabsTrigger value="earnings">Мой заработок</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <PaymentsHistory managerId={userId} />
          </TabsContent>

          <TabsContent value="students">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Все ученики</h3>
              <AllStudentsList />
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">История заработка</h3>
              <ManagerEarningsHistory managerId={userId} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AllStudentsList() {
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const supabase = createBrowserClient()
    const { data } = await supabase.from("students").select("*, profiles(full_name)").order("name")

    setStudents(data || [])
  }

  return (
    <div className="space-y-2">
      {students.map((student) => (
        <div key={student.id} className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{student.name}</p>
            <p className="text-sm text-gray-600">Репетитор: {student.profiles?.full_name || "Не назначен"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Осталось уроков</p>
            <p className="text-lg font-semibold">{student.remaining_lessons}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ManagerEarningsHistory({ managerId }: { managerId: string }) {
  const [earnings, setEarnings] = useState<any[]>([])

  useEffect(() => {
    loadEarnings()
  }, [managerId])

  async function loadEarnings() {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from("manager_salaries")
      .select("*")
      .eq("manager_id", managerId)
      .order("week_start", { ascending: false })

    setEarnings(data || [])
  }

  return (
    <div className="space-y-2">
      {earnings.map((earning) => (
        <div key={earning.id} className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Неделя {new Date(earning.week_start).toLocaleDateString("ru-RU")}</p>
            <p className="text-sm text-gray-600">
              Продажи: {earning.sales_amount} ₽ | Комиссия: {earning.commission} ₽
            </p>
          </div>
          <p className="text-lg font-semibold text-green-600">{earning.total_salary} ₽</p>
        </div>
      ))}
    </div>
  )
}
