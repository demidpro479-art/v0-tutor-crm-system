"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, GraduationCap, DollarSign, TrendingUp, UserPlus, Database, UserCog, UsersRound } from "lucide-react"
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
      // Загружаю уроки для каждого ученика
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
            <p className="mt-2 text-slate-600 text-lg">Полный контроль над системой и прямой доступ к БД</p>
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
          <Card className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Общий доход</p>
                <p className="text-4xl font-bold text-green-900 mt-2">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Чистая прибыль</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  {monthlyStats?.net_profit?.toLocaleString() || 0} ₽
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 border-purple-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Проведено уроков</p>
                <p className="text-4xl font-bold text-purple-900 mt-2">{monthlyStats?.completed_lessons || 0}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Всего пользователей</p>
                <p className="text-4xl font-bold text-orange-900 mt-2">{monthlyStats?.total_users || 0}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="database" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-md border-2 p-1 rounded-lg">
            <TabsTrigger
              value="database"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Database className="mr-2 h-4 w-4" />
              База данных
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="migration"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <UsersRound className="mr-2 h-4 w-4" />
              Миграция
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Выплаты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database">
            <AdminDatabaseAccess />
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6">
              <UsersTable users={users} onUpdate={loadData} />
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="p-6">
              <StudentsTable students={students} tutors={tutors} onUpdate={loadData} />
            </Card>
          </TabsContent>

          <TabsContent value="migration">
            <Card className="p-6">
              <StudentMigration students={students} tutors={tutors} onMigrationComplete={loadData} />
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <AdminPayoutsManagement />
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} onUserAdded={loadData} />
    </div>
  )
}
