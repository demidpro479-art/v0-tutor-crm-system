"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

interface SalaryPayment {
  id: string
  user_id: string
  amount: number
  period_start: string
  period_end: string
  status: string
  created_at: string
  rejection_reason?: string
  profiles: {
    full_name: string
    role: string
  }
}

export function AdminPaymentManagement() {
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const supabase = createClient()

  useEffect(() => {
    loadPayments()
  }, [])

  async function loadPayments() {
    try {
      const { data, error } = await supabase
        .from("salary_payments")
        .select(`
          *,
          profiles:user_id (
            full_name,
            role
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error("Error loading payments:", error)
      toast.error("Ошибка загрузки выплат")
    } finally {
      setLoading(false)
    }
  }

  async function approvePayment(paymentId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.rpc("update_salary_payment_status", {
        p_payment_id: paymentId,
        p_status: "paid",
        p_processed_by: user.id,
      })

      if (error) throw error

      toast.success("Выплата одобрена")
      loadPayments()
    } catch (error) {
      console.error("Error approving payment:", error)
      toast.error("Ошибка при одобрении выплаты")
    }
  }

  async function rejectPayment() {
    if (!selectedPayment || !rejectionReason.trim()) {
      toast.error("Укажите причину отклонения")
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.rpc("update_salary_payment_status", {
        p_payment_id: selectedPayment.id,
        p_status: "rejected",
        p_processed_by: user.id,
        p_rejection_reason: rejectionReason,
      })

      if (error) throw error

      toast.success("Выплата отклонена")
      setRejectDialogOpen(false)
      setRejectionReason("")
      setSelectedPayment(null)
      loadPayments()
    } catch (error) {
      console.error("Error rejecting payment:", error)
      toast.error("Ошибка при отклонении выплаты")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Выплачено</Badge>
      case "rejected":
        return <Badge variant="destructive">Отклонено</Badge>
      default:
        return <Badge variant="secondary">В ожидании</Badge>
    }
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Управление выплатами</h3>
        <div className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет выплат</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{payment.profiles.full_name}</p>
                    <Badge variant="outline">{payment.profiles.role}</Badge>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Период: {new Date(payment.period_start).toLocaleDateString("ru-RU")} -{" "}
                    {new Date(payment.period_end).toLocaleDateString("ru-RU")}
                  </p>
                  {payment.rejection_reason && (
                    <p className="text-sm text-red-600 mt-1">Причина отклонения: {payment.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">{payment.amount.toFixed(2)} ₽</p>
                  {payment.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approvePayment(payment.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedPayment(payment)
                          setRejectDialogOpen(true)
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Отклонить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Диалог отклонения выплаты */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Отклонить выплату</DialogTitle>
            <DialogDescription>Укажите причину отклонения выплаты. Сумма будет обнулена.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Причина отклонения</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Например: Чек не предоставлен, неверная сумма..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={rejectPayment}>
              Отклонить выплату
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
