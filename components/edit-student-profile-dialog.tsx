"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Minus } from "lucide-react"

interface Student {
  id: string
  full_name: string
  email: string
  total_paid_lessons: number
  remaining_lessons: number
}

interface EditStudentProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student
  onStudentUpdated: () => void
}

export function EditStudentProfileDialog({
  open,
  onOpenChange,
  student,
  onStudentUpdated,
}: EditStudentProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(student.full_name)
  const [email, setEmail] = useState(student.email)
  const [totalLessons, setTotalLessons] = useState(student.total_paid_lessons)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email: email,
        })
        .eq("id", student.id)

      if (profileError) throw profileError

      if (totalLessons !== student.total_paid_lessons) {
        const lessonsDiff = totalLessons - student.total_paid_lessons

        const { error: paymentError } = await supabase.from("payments").insert({
          student_id: student.id,
          lessons_purchased: lessonsDiff,
          amount: lessonsDiff * 500,
          notes: `Корректировка баланса ГА: ${lessonsDiff > 0 ? "+" : ""}${lessonsDiff} уроков`,
        })

        if (paymentError) throw paymentError

        console.log("[v0] Корректировка уроков:", { studentId: student.id, diff: lessonsDiff })
      }

      toast({
        title: "Успешно",
        description: "Профиль ученика обновлен",
      })

      onStudentUpdated()
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Ошибка обновления профиля:", error)
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать профиль ученика</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Полное имя</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalLessons">Всего оплачено уроков</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTotalLessons(Math.max(0, totalLessons - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="totalLessons"
                type="number"
                value={totalLessons}
                onChange={(e) => setTotalLessons(Number.parseInt(e.target.value) || 0)}
                className="text-center"
                min="0"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setTotalLessons(totalLessons + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Текущий остаток: {student.remaining_lessons} уроков</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
