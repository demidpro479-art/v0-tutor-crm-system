"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, GraduationCap, DollarSign, TrendingUp, UserPlus } from "lucide-react"
import { AddUserDialog } from "@/components/add-user-dialog"
import { UsersTable } from "@/components/users-table"
import { StudentsTable } from "@/components/students-table"
import { AdminPaymentManagement } from "@/components/admin-payment-management"
import { StudentsByTutor } from "@/components/students-by-tutor"

interface AdminDashboardProps {
  users: any[]
  students: any[]
  monthlyStats: any
}

export function AdminDashboard({ users, students, monthlyStats }: AdminDashboardProps) {
  const [showAddUser, setShowAddUser] = useState(false)
  const [loading, setLoading] = useState(false)

  const tutors = users.filter((u) => u.role === "tutor")
  const managers = users.filter((u) => u.role === "manager")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Панель Главного Администратора
            </h1>
            <p className="mt-2 text-slate-600">Полный контроль над системой репетиторского центра</p>
          </div>
          <Button
            onClick={() => setShowAddUser(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить пользователя
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Общий доход</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-green-600 mt-1">За текущий месяц</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Чистая прибыль</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {monthlyStats?.net_profit?.toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-blue-600 mt-1">После всех выплат</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Проведено уроков</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{monthlyStats?.completed_lessons || 0}</p>
                <p className="text-xs text-purple-600 mt-1">За текущий месяц</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Всего пользователей</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{users.length}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {tutors.length} репетиторов, {managers.length} менеджеров
                </p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Пользователи
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Зарплаты
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <UsersTable users={users} />
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-6">
              <StudentsByTutor tutors={tutors} />
              <StudentsTable students={students} tutors={tutors} />
            </div>
          </TabsContent>

          <TabsContent value="salary" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminPaymentManagement />
          </TabsContent>

          <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="p-6 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Настройки системы</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Тарифы</h4>
                  <p className="text-sm text-blue-700">Настройка стоимости уроков и комиссий</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Уведомления</h4>
                  <p className="text-sm text-green-700">Настройка email и push уведомлений</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">Интеграции</h4>
                  <p className="text-sm text-purple-700">Подключение внешних сервисов</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} />
    </div>
  )
}
