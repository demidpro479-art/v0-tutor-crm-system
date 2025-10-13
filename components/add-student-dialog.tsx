"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { UserPlus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStudentAdded: () => void
  currentUserId?: string
  userRole?: string
}

interface Tutor {
  id: string
  full_name: string | null
  email: string
}

export function AddStudentDialog({
  open,
  onOpenChange,
  onStudentAdded,
  currentUserId,
  userRole,
}: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [createAccount, setCreateAccount] = useState(true)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    hourly_rate: "",
    notes: "",
    lesson_link: "",
  })

  useEffect(() => {
    if (open && userRole === "admin") {
      loadTutors()
    } else if (open && (userRole === "tutor" || !userRole)) {
      // Если это репетитор или роль не указана, автоматически выбираем текущего пользователя
      setSelectedTutorId(currentUserId || "")
    }
  }, [open, userRole, currentUserId])

  async function loadTutors() {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "tutor")
      .order("full_name")

    if (data) {
      setTutors(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      console.log("[v0] Добавление ученика:", formData)

      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            hourly_rate: Number.parseFloat(formData.hourly_rate) || 0,
            notes: formData.notes || null,
            remaining_lessons: 0,
            total_paid_lessons: 0,
            is_active: true,
            tutor_id: selectedTutorId || currentUserId || null,
            lesson_link: formData.lesson_link || null,
          },
        ])
        .select()

      if (error) {
        console.error("[v0] Ошибка при добавлении ученика:", error)
        toast({
          title: "Ошибка",
          description: `Не удалось добавить ученика: ${error.message}`,
          variant: "destructive",
        })
        throw error
      }

      console.log("[v0] Ученик успешно добавлен:", data)

      if (createAccount && data && data[0]) {
        const { data: accountData, error: accountError } = await supabase.rpc("create_student_account", {
          p_student_id: data[0].id,
        })

        if (accountError) {
          console.error("[v0] Ошибка создания аккаунта:", accountError)
          toast({
            title: "Ученик добавлен",
            description: "Но не удалось создать учетную запись. Создайте её вручную.",
            variant: "destructive",
          })
        } else if (accountData && accountData[0]) {
          const login = accountData[0].login
          const password = accountData[0].password

          // Создаем реальный Supabase аккаунт через API
          const response = await fetch("/api/create-student-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: data[0].id,
              login,
              password,
              studentName: formData.name,
            }),
          })

          if (!response.ok) {
            console.error("[v0] Ошибка создания Supabase аккаунта через API")
            toast({
              title: "Ученик добавлен",
              description: "Но не удалось создать учетную запись для входа.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Успешно!",
              description: `Ученик добавлен. Логин: ${login}, Пароль: ${password}`,
              duration: 10000,
            })
          }
        }
      } else {
        toast({
          title: "Успешно",
          description: "Ученик успешно добавлен",
        })
      }

      // Сброс формы
      setFormData({
        name: "",
        email: "",
        phone: "",
        hourly_rate: "",
        notes: "",
        lesson_link: "",
      })
      setSelectedTutorId("")

      onOpenChange(false)
      onStudentAdded()
    } catch (error) {
      console.error("[v0] Ошибка добавления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Добавить ученика
          </DialogTitle>
          <DialogDescription>Заполните информацию о новом ученике</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Иван Иванов"
              />
            </div>

            {userRole === "admin" && (
              <div className="grid gap-2">
                <Label htmlFor="tutor">Репетитор *</Label>
                <Select value={selectedTutorId} onValueChange={setSelectedTutorId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите репетитора" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.full_name || tutor.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lesson_link">Ссылка на урок</Label>
              <Input
                id="lesson_link"
                type="url"
                value={formData.lesson_link}
                onChange={(e) => setFormData({ ...formData, lesson_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
              <p className="text-xs text-muted-foreground">Эта ссылка будет использоваться для всех уроков ученика</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hourly_rate">Стоимость урока (₽)</Label>
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="1000"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация об ученике..."
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="create-account" className="text-sm font-medium">
                  Создать учетную запись
                </Label>
                <p className="text-xs text-muted-foreground">Автоматически создать логин и пароль для ученика</p>
              </div>
              <Switch id="create-account" checked={createAccount} onCheckedChange={setCreateAccount} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
