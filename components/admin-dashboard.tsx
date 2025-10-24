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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/20 border-t-purple-500 mx-auto"></div>
            <Sparkles className="h-6 w-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-6 text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Загрузка панели администратора...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-2.5 sm:p-3 shadow-lg shadow-purple-500/30">
                <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Панель Администратора
                </h1>
                <p className="text-slate-400 text-sm sm:text-base md:text-lg mt-1">Полный контроль над системой</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowAddUser(true)}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Добавить пользователя
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1 border-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider">Общий доход</p>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent truncate">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-emerald-400/70">За текущий месяц</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 sm:p-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 border-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-blue-400 uppercase tracking-wider">Чистая прибыль</p>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
                  {monthlyStats?.net_profit?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-blue-400/70">После выплат</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3 sm:p-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1 border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-purple-400 uppercase tracking-wider">
                  Проведено уроков
                </p>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {monthlyStats?.completed_lessons || 0}
                </p>
                <p className="text-xs text-purple-400/70">В этом месяце</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-3 sm:p-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1 border-orange-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-orange-400 uppercase tracking-wider">Пользователей</p>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  {monthlyStats?.total_users || 0}
                </p>
                <p className="text-xs text-orange-400/70">Всего в системе</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-3 sm:p-4 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="database" className="space-y-6 animate-scale-in">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="glass-card p-1.5 rounded-xl h-auto gap-2 inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="database"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <Database className="mr-2 h-4 w-4" />
                База данных
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <UserCog className="mr-2 h-4 w-4" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Ученики
              </TabsTrigger>
              <TabsTrigger
                value="migration"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Миграция
              </TabsTrigger>
              <TabsTrigger
                value="payouts"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Выплаты
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="database" className="animate-fade-in">
            <AdminDatabaseAccess />
          </TabsContent>

          <TabsContent value="users" className="animate-fade-in">
            <UsersTable users={users} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="students" className="animate-fade-in">
            <StudentsTable students={students} tutors={tutors} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="migration" className="animate-fade-in">
            <StudentMigration students={students} tutors={tutors} onMigrationComplete={loadData} />
          </TabsContent>

          <TabsContent value="payouts" className="animate-fade-in">
            <AdminPayoutsManagement />
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} onUserAdded={loadData} />
    </div>
  )
}
