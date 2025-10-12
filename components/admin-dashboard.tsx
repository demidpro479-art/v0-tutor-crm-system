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

  const tutors = users.filter((u) => u.role === "tutor")
  const managers = users.filter((u) => u.role === "manager")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Панель Главного Администратора</h1>
            <p className="text-slate-600">Управление всей системой</p>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить пользователя
          </Button>
        </div>

        {/* Статистика за месяц */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Общий доход</p>
                <p className="text-2xl font-bold text-slate-900">
                  {monthlyStats?.total_revenue?.toLocaleString() || 0} ₽
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Чистая прибыль</p>
                <p className="text-2xl font-bold text-slate-900">{monthlyStats?.net_profit?.toLocaleString() || 0} ₽</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Проведено уроков</p>
                <p className="text-2xl font-bold text-slate-900">{monthlyStats?.completed_lessons || 0}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Всего пользователей</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Вкладки */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="students">Ученики</TabsTrigger>
            <TabsTrigger value="salary">Зарплаты</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTable users={users} />
          </TabsContent>

          <TabsContent value="students">
            <div className="space-y-6">
              <StudentsByTutor tutors={tutors} />
              <StudentsTable students={students} tutors={tutors} />
            </div>
          </TabsContent>

          <TabsContent value="salary">
            <AdminPaymentManagement />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки системы</h3>
              <p className="text-slate-600">Здесь будут настройки системы</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} />
    </div>
  )
}
