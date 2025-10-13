"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, CheckCircle, Calendar } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

interface SalaryPaymentsProps {
  users: User[]
}

export function SalaryPayments({ users }: SalaryPaymentsProps) {
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSalaries()
  }, [])

  const loadSalaries = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("salaries")
        .select(
          `
          *,
          users!salaries_user_id_fkey(full_name, email, role)
        `,
        )
        .order("week_start", { ascending: false })
        .limit(50)

      if (error) throw error
      setSalaries(data || [])
    } catch (error) {
      console.error("Ошибка загрузки зарплат:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsPaid = async (salaryId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("salaries")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("id", salaryId)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Зарплата отмечена как выплаченная",
      })

      loadSalaries()
    } catch (error) {
      console.error("Ошибка обновления зарплаты:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      })
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "tutor":
        return "Репетитор"
      case "manager":
        return "Менеджер"
      default:
        return role
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-slate-600">Загрузка...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Выплаты зарплат</h2>
          <p className="text-slate-600">Управление выплатами сотрудникам</p>
        </div>
      </div>

      {salaries.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Нет записей о зарплатах</h3>
          <p className="text-slate-600">Зарплаты будут рассчитываться автоматически</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {salaries.map((salary) => (
            <Card
              key={salary.id}
              className={`p-6 transition-all duration-200 hover:shadow-lg ${
                salary.paid ? "bg-green-50 border-green-200" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {salary.users?.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{salary.users?.full_name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleText(salary.users?.role)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(salary.week_start).toLocaleDateString("ru-RU")} -{" "}
                          {new Date(salary.week_end).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{salary.amount.toLocaleString()} ₽</p>
                    {salary.users?.role === "tutor" && (
                      <p className="text-sm text-slate-600">{salary.lessons_count} уроков</p>
                    )}
                    {salary.users?.role === "manager" && (
                      <p className="text-sm text-slate-600">Продажи: {salary.sales_amount?.toLocaleString() || 0} ₽</p>
                    )}
                  </div>

                  {salary.paid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Выплачено
                    </Badge>
                  ) : (
                    <Button onClick={() => markAsPaid(salary.id)} size="sm">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Выплатить
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
