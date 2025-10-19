"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react"
import { toast } from "sonner"

export function AdminPayoutsManagement() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [payoutItems, setPayoutItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPayouts()
  }, [])

  async function loadPayouts() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("payouts")
      .select(`
        *,
        user:users!payouts_user_id_fkey(full_name, email, role)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading payouts:", error)
      toast.error("Ошибка загрузки выплат")
    } else {
      setPayouts(data || [])
    }

    setLoading(false)
  }

  async function loadPayoutItems(payoutId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("payout_items")
      .select("*")
      .eq("payout_id", payoutId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading payout items:", error)
      toast.error("Ошибка загрузки деталей выплаты")
    } else {
      setPayoutItems(data || [])
    }
  }

  async function handleApprovePayout(payoutId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from("payouts")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId)

    if (error) {
      toast.error("Ошибка одобрения выплаты")
    } else {
      toast.success("Выплата одобрена")
      loadPayouts()
      setSelectedPayout(null)
    }
  }

  async function handleRejectPayout(payoutId: string) {
    const supabase = createClient()

    // Возвращаем деньги на баланс
    const payout = payouts.find((p) => p.id === payoutId)
    if (payout) {
      await supabase.rpc("update_user_balance", {
        p_user_id: payout.user_id,
        p_amount: payout.amount,
        p_transaction_type: "payout_rejected",
        p_reference_id: payoutId,
        p_description: "Выплата отклонена, средства возвращены",
      })
    }

    const { error } = await supabase
      .from("payouts")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId)

    if (error) {
      toast.error("Ошибка отклонения выплаты")
    } else {
      toast.success("Выплата отклонена, средства возвращены")
      loadPayouts()
      setSelectedPayout(null)
    }
  }

  async function handleCancelPayout(payoutId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from("payouts")
      .update({
        status: "cancelled",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId)

    if (error) {
      toast.error("Ошибка отмены выплаты")
    } else {
      toast.success("Выплата отменена без возврата средств")
      loadPayouts()
      setSelectedPayout(null)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { label: string; variant: any }> = {
      pending: { label: "Ожидает", variant: "secondary" },
      approved: { label: "Одобрена", variant: "default" },
      rejected: { label: "Отклонена", variant: "destructive" },
      cancelled: { label: "Отменена", variant: "outline" },
      partially_approved: { label: "Частично одобрена", variant: "secondary" },
    }

    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка выплат...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Управление выплатами</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell className="font-medium">{payout.user?.full_name}</TableCell>
                <TableCell>{payout.user?.role}</TableCell>
                <TableCell>{payout.amount.toLocaleString()} ₽</TableCell>
                <TableCell>{getStatusBadge(payout.status)}</TableCell>
                <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPayout(payout)
                      loadPayoutItems(payout.id)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Детали
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Детали выплаты</DialogTitle>
            <DialogDescription>
              Выплата для {selectedPayout?.user?.full_name} на сумму {selectedPayout?.amount.toLocaleString()} ₽
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Способ оплаты</p>
                <p className="font-medium">{selectedPayout?.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Реквизиты</p>
                <p className="font-medium">{selectedPayout?.payment_details}</p>
              </div>
            </div>

            {selectedPayout?.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Примечания</p>
                <p className="font-medium">{selectedPayout.notes}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Детализация выплаты</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_type}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.amount.toLocaleString()} ₽</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedPayout?.status === "pending" && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleCancelPayout(selectedPayout.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Отменить полностью
                </Button>
                <Button variant="destructive" onClick={() => handleRejectPayout(selectedPayout.id)}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
                <Button onClick={() => handleApprovePayout(selectedPayout.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Одобрить
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
