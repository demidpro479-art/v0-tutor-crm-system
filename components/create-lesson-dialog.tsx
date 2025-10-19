"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreateLessonDialogProps {
  onLessonCreated: () => void
  tutorId: string
}

export function CreateLessonDialog({ onLessonCreated, tutorId }: CreateLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    student_id: "",
    scheduled_at: "",
    duration: "60",
    price: "500",
    notes: "",
  })

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open])

  async function loadStudents() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .eq("tutor_id", tutorId)
      .order("full_name")

    if (error) {
      console.error("[v0] Ошибка загрузки учеников:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список учеников",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] CreateLessonDialog - Загружено учеников:", data?.length || 0)
    setStudents(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("lessons").insert({
        student_id: formData.student_id,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        duration: Number.parseInt(formData.duration),
        price: Number.parseFloat(formData.price),
        notes: formData.notes,
        status: "scheduled",
      })

      if (error) throw error

      toast({
        title: "Урок создан",
        description: "Урок успешно добавлен в расписание",
      })

      setOpen(false)
      setFormData({
        student_id: "",
        scheduled_at: "",
        duration: "60",
        price: "500",
        notes: "",
      })
      onLessonCreated()
    } catch (error: any) {
      console.error("[v0] Ошибка создания урока:", error)
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать урок
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Создать новый урок</DialogTitle>
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
                {students.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Нет доступных учеников</div>
                ) : (
                  students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Дата и время</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Длительность (мин)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Стоимость (₽)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки (необязательно)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Тема урока, домашнее задание и т.д."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || students.length === 0}>
            {loading ? "Создание..." : "Создать урок"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
