"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUpRight, FileText } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface CreatePayoutDialogProps {
  tutorId: string
  availableBalance: number
  onPayoutCreated: () => void
}

export function CreatePayoutDialog({ tutorId, availableBalance, onPayoutCreated }: CreatePayoutDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [notes, setNotes] = useState("")
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadUnpaidLessons()
    }
  }, [open])

  async function loadUnpaidLessons() {
    try {
      const supabase = createBrowserClient()

      // Загружаем все неоплаченные уроки репетитора
      const { data: earnings } = await supabase
        .from("tutor_earnings")
        .select(
          `
          *,
          lesson:lessons(
            id,
            scheduled_at,
            title,
            student:students(full_name)
          )
        `,
        )
        .eq("tutor_id", tutorId)
        .eq("status", "earned")

      setLessons(earnings || [])
    } catch (error) {
      console.error("[v0] Error loading lessons:", error)
    }
  }

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму выплаты",
        variant: "destructive",
      })
      return
    }

    if (Number(amount) > availableBalance) {
      toast({
        title: "Ошибка",
        description: "Недостаточно средств на балансе",
        variant: "destructive",
      })
      return
    }

    if (!paymentMethod) {
      toast({
        title: "Ошибка",
        description: "Укажите куда перевести деньги",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = createBrowserClient()

    try {
      // Создаем заявку на выплату
      const { error } = await supabase.from("salary_payments").insert({
        user_id: tutorId,
        amount: Number(amount),
        status: "pending",
        payment_type: "tutor_earnings",
        notes: `${paymentMethod}\n\n${notes}\n\nУроки:\n${lessons.map((l) => `- ${l.lesson?.title || "Урок"} (${new Date(l.lesson?.scheduled_at).toLocaleDateString()}) - ${l.amount}₽`).join("\n")}`,
      })

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Заявка на выплату создана",
      })

      setOpen(false)
      setAmount("")
      setPaymentMethod("")
      setNotes("")
      onPayoutCreated()
    } catch (error) {
      console.error("[v0] Error creating payout:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать заявку",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Вывести средства
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать заявку на выплату</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
            <p className="text-sm font-medium text-emerald-900 mb-2">Доступно для вывода:</p>
            <p className="text-3xl font-bold text-emerald-600">{availableBalance.toFixed(0)} ₽</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма выплаты (₽)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Введите сумму"
              max={availableBalance}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Куда перевести деньги</Label>
            <Input
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Номер карты, телефон или реквизиты"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Дополнительная информация (необязательно)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к выплате"
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-slate-600" />
              <p className="text-sm font-medium text-slate-900">Детализация заработка</p>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lessons.length === 0 ? (
                <p className="text-sm text-slate-500">Нет неоплаченных уроков</p>
              ) : (
                lessons.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {earning.lesson?.title || "Урок"} - {new Date(earning.lesson?.scheduled_at).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-emerald-600">{earning.amount}₽</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Создание..." : "Создать заявку"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
