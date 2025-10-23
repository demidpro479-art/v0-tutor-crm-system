"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  UserPlus,
  Database,
  UserCog,
  UsersRound,
  Sparkles,
  BarChart3,
  Shield,
} from "lucide-react"
import { AddUserDialog } from "@/components/add-user-dialog"
import { AdminDatabaseAccess } from "@/components/admin-database-access"
import { AdminPayoutsManagement } from "@/components/admin-payouts-management"
import { UsersTable } from "@/components/users-table"
import { StudentsTable } from "@/components/students-table"
import { StudentMigration } from "@/components/student-migration"
import { createClient } from "@/lib/supabase/client"

export function AdminDashboard() {
  const [showAddUser, setShowAddUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthlyStats, setMonthlyStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [tutors, setTutors] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("*")
      .eq("status", "completed")
      .gte("scheduled_at", startOfMonth.toISOString())

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString())

    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0
    const tutorEarnings = (lessonsData?.length || 0) * 500
    const netProfit = totalRevenue - tutorEarnings

    const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

    setMonthlyStats({
      total_revenue: totalRevenue,
      net_profit: netProfit,
      completed_lessons: lessonsData?.length || 0,
      total_users: usersCount || 0,
    })

    const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    setUsers(usersData || [])

    const { data: studentsData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false })

    if (studentsData) {
      const studentsWithLessons = await Promise.all(
        studentsData.map(async (student) => {
          const { count: paidCount } = await supabase
            .from("lessons")
            .select("*", { count: "exact", head: true })
            .eq("student_id", student.user_id)

          const { count: completedCount } = await supabase
            .from("lessons")
            .select("*", { count: "exact", head: true })
            .eq("student_id", student.user_id)
            .eq("status", "completed")

          return {
            ...student,
            total_paid_lessons: paidCount || 0,
            completed_lessons: completedCount || 0,
          }
        }),
      )
      setStudents(studentsWithLessons)
    }

    const { data: tutorsData } = await supabase.from("profiles").select("*").eq("role", "tutor")
    setTutors(tutorsData || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <Sparkles className="h-6 w-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Загрузка панели администратора...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Панель Администратора
                </h1>
                <p className="text-slate-600 text-lg mt-1">Полный контроль над системой</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowAddUser(true)}
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Добавить пользователя
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Общий доход</p>
                <p className="text-4xl font-bold bg-gradient-to-br from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-emerald-600">За текущий месяц</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">Чистая прибыль</p>
                <p className="text-4xl font-bold bg-gradient-to-br from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  {monthlyStats?.net_profit?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-blue-600">После выплат</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 border-purple-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wider">Проведено уроков</p>
                <p className="text-4xl font-bold bg-gradient-to-br from-purple-700 to-pink-700 bg-clip-text text-transparent">
                  {monthlyStats?.completed_lessons || 0}
                </p>
                <p className="text-xs text-purple-600">В этом месяце</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-orange-700 uppercase tracking-wider">Пользователей</p>
                <p className="text-4xl font-bold bg-gradient-to-br from-orange-700 to-amber-700 bg-clip-text text-transparent">
                  {monthlyStats?.total_users || 0}
                </p>
                <p className="text-xs text-orange-600">Всего в системе</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="database" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="glass-effect dark:glass-effect-dark p-1.5 rounded-xl h-auto gap-2">
            <TabsTrigger
              value="database"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <Database className="mr-2 h-4 w-4" />
              База данных
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="migration"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <UsersRound className="mr-2 h-4 w-4" />
              Миграция
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Выплаты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminDatabaseAccess />
          </TabsContent>

          <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <UsersTable users={users} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StudentsTable students={students} tutors={tutors} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="migration" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StudentMigration students={students} tutors={tutors} onMigrationComplete={loadData} />
          </TabsContent>

          <TabsContent value="payouts" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminPayoutsManagement />
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} onUserAdded={loadData} />
    </div>
  )
}
