"use client"

import type React from "react"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddPaymentDialogProps {
  onPaymentAdded: () => void
  managerId: string
}

export function AddPaymentDialog({ onPaymentAdded, managerId }: AddPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    lessons_purchased: "",
    receipt_url: "",
  })

  async function loadStudents() {
    const supabase = createBrowserClient()
    const { data } = await supabase.from("students").select("id, name").order("name")

    setStudents(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createBrowserClient()

      // Add payment
      const { error: paymentError } = await supabase.from("payments").insert({
        student_id: formData.student_id,
        amount: Number.parseFloat(formData.amount),
        lessons_purchased: Number.parseInt(formData.lessons_purchased),
        manager_id: managerId,
        receipt_url: formData.receipt_url || null,
        status: "completed",
      })

      if (paymentError) throw paymentError

      // Update student's paid lessons
      const { error: updateError } = await supabase.rpc("add_paid_lessons", {
        p_student_id: formData.student_id,
        p_lessons_count: Number.parseInt(formData.lessons_purchased),
      })

      if (updateError) throw updateError

      toast({
        title: "Платеж добавлен",
        description: "Уроки успешно добавлены ученику",
      })

      setOpen(false)
      setFormData({
        student_id: "",
        amount: "",
        lessons_purchased: "",
        receipt_url: "",
      })
      onPaymentAdded()
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={loadStudents}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить платеж
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить платеж</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Ученик</Label>
            <Select
              value={formData.student_id}
              onValueChange={(value) => setFormData({ ...formData, student_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите ученика" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessons">Количество уроков</Label>
            <Input
              id="lessons"
              type="number"
              value={formData.lessons_purchased}
              onChange={(e) => setFormData({ ...formData, lessons_purchased: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Ссылка на чек (необязательно)</Label>
            <Input
              id="receipt"
              type="url"
              placeholder="https://..."
              value={formData.receipt_url}
              onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Добавление..." : "Добавить платеж"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
