"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, GraduationCap, DollarSign, TrendingUp, UserPlus, ArrowRightLeft } from "lucide-react"
import { AddUserDialog } from "@/components/add-user-dialog"
import { UsersTable } from "@/components/users-table"
import { StudentsTable } from "@/components/students-table"
import { AdminPaymentManagement } from "@/components/admin-payment-management"
import { StudentsByTutor } from "@/components/students-by-tutor"
import { StudentMigration } from "@/components/student-migration"
import { createClient } from "@/lib/supabase/client"

export function AdminDashboard() {
  const [showAddUser, setShowAddUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    console.log("[v0] AdminDashboard - Загрузка данных")

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })

    console.log("[v0] AdminDashboard - Users:", { count: usersData?.length, error: usersError })

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("*, tutor:users!students_tutor_id_fkey(full_name)")
      .order("created_at", { ascending: false })

    console.log("[v0] AdminDashboard - Students:", { count: studentsData?.length, error: studentsError })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("*")
      .eq("status", "completed")
      .gte("scheduled_at", startOfMonth.toISOString())

    const totalRevenue = lessonsData?.reduce((sum, lesson) => sum + (Number(lesson.price) || 0), 0) || 0
    const { data: earningsData } = await supabase
      .from("tutor_earnings")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString())

    const tutorEarnings = earningsData?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0
    const netProfit = totalRevenue - tutorEarnings

    setUsers(usersData || [])
    setStudents(studentsData || [])
    setMonthlyStats({
      total_revenue: totalRevenue,
      net_profit: netProfit,
      completed_lessons: lessonsData?.length || 0,
    })
    setLoading(false)

    console.log("[v0] AdminDashboard - Данные загружены:", {
      usersCount: usersData?.length,
      studentsCount: studentsData?.length,
      monthlyStats,
    })
  }

  const tutors = users.filter((u) => u.role === "tutor" || u.role === "admin")
  const managers = users.filter((u) => u.role === "manager")

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent drop-shadow-sm">
              Панель Главного Администратора
            </h1>
            <p className="mt-2 text-slate-600 text-lg">Полный контроль над системой репетиторского центра</p>
          </div>
          <Button
            onClick={() => setShowAddUser(true)}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Добавить пользователя
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Общий доход</p>
                <p className="text-4xl font-bold text-green-900 mt-2">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-green-600 mt-2 font-medium">За текущий месяц</p>
              </div>
              <div className="rounded-full bg-gradient-to-br from-green-100 to-emerald-100 p-4 shadow-inner">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Чистая прибыль</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  {monthlyStats?.net_profit?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">После всех выплат</p>
              </div>
              <div className="rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 p-4 shadow-inner">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Проведено уроков</p>
                <p className="text-4xl font-bold text-purple-900 mt-2">{monthlyStats?.completed_lessons || 0}</p>
                <p className="text-xs text-purple-600 mt-2 font-medium">За текущий месяц</p>
              </div>
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-4 shadow-inner">
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Всего пользователей</p>
                <p className="text-4xl font-bold text-orange-900 mt-2">{users.length}</p>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  {tutors.length} репетиторов, {managers.length} менеджеров
                </p>
              </div>
              <div className="rounded-full bg-gradient-to-br from-orange-100 to-amber-100 p-4 shadow-inner">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-md border-2 p-1 rounded-lg">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <Users className="mr-2 h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="migration"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Миграция
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Зарплаты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <UsersTable users={users} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-6">
              <StudentsByTutor tutors={tutors} students={students} />
              <StudentsTable students={students} tutors={tutors} onUpdate={loadData} />
            </div>
          </TabsContent>

          <TabsContent value="migration" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StudentMigration students={students} tutors={tutors} onMigrationComplete={loadData} />
          </TabsContent>

          <TabsContent value="salary" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminPaymentManagement />
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} onUserAdded={loadData} />
    </div>
  )
}
