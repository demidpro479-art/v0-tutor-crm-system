"use client"

import { useState } from "react"
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
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2, UserPlus, Copy, Check, Minus, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Student {
  id: string
  name: string
  email: string
  phone: string
  notes: string
  total_paid_lessons: number
  remaining_lessons: number
  hourly_rate: number
  is_active: boolean
  created_at: string
  student_login?: string
  student_password?: string
  has_account?: boolean
}

interface StudentDetailsDialogProps {
  student: Student
  open: boolean
  onOpenChange: (open: boolean) => void
  onStudentUpdated: () => void
}

export function StudentDetailsDialog({ student, open, onOpenChange, onStudentUpdated }: StudentDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showAddLessons, setShowAddLessons] = useState(false)
  const [lessonsToAdd, setLessonsToAdd] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [copiedLogin, setCopiedLogin] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [showDeductLessons, setShowDeductLessons] = useState(false)
  const [lessonsToDeduct, setLessonsToDeduct] = useState("")
  const [deductReason, setDeductReason] = useState("")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email || "",
    phone: student.phone || "",
    hourly_rate: student.hourly_rate.toString(),
    notes: student.notes || "",
    is_active: student.is_active,
  })

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("students")
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          hourly_rate: Number.parseFloat(formData.hourly_rate) || 0,
          notes: formData.notes || null,
          is_active: formData.is_active,
        })
        .eq("id", student.id)

      if (error) throw error
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка обновления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLessons = async () => {
    if (!lessonsToAdd || !paymentAmount) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.rpc("add_paid_lessons", {
        p_student_id: student.id,
        p_lessons_count: Number.parseInt(lessonsToAdd),
        p_amount: Number.parseFloat(paymentAmount),
        p_notes: `Добавлено ${lessonsToAdd} уроков`,
      })

      if (error) throw error

      setLessonsToAdd("")
      setPaymentAmount("")
      setShowAddLessons(false)
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка добавления уроков:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось добавить уроки",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этого ученика? Это действие нельзя отменить.")) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("students").delete().eq("id", student.id)

      if (error) throw error
      onStudentUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка удаления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: accountData, error: accountError } = await supabase.rpc("create_student_account", {
        p_student_id: student.id,
      })

      if (accountError) throw accountError

      const login = accountData[0].login
      const password = accountData[0].password

      console.log("[v0] Создание Supabase аккаунта через API:", { login, password })

      const response = await fetch("/api/create-student-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          login: login,
          password: password,
          studentName: student.name,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Не удалось создать аккаунт")
      }

      console.log("[v0] Аккаунт успешно создан")

      toast({
        title: "Учетная запись создана",
        description: `Логин: ${login}, Пароль: ${password}`,
      })

      onStudentUpdated()
    } catch (error) {
      console.error("[v0] Ошибка создания учетной записи:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать учетную запись",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateAccount = async () => {
    if (!confirm("Перегенерировать учетную запись? Старые данные для входа станут недействительными.")) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Удаляем старый аккаунт если есть
      if (student.has_account) {
        const { error: deleteError } = await supabase
          .from("students")
          .update({
            student_login: null,
            student_password: null,
            auth_user_id: null,
          })
          .eq("id", student.id)

        if (deleteError) throw deleteError
      }

      // Создаем новый аккаунт
      await handleCreateAccount()
    } catch (error) {
      console.error("[v0] Ошибка перегенерации аккаунта:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать учетную запись",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeductLessons = async () => {
    if (!lessonsToDeduct) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc("deduct_lessons", {
        p_student_id: student.id,
        p_lessons_count: Number.parseInt(lessonsToDeduct),
        p_reason: deductReason || "Списание уроков",
      })

      if (error) throw error

      toast({
        title: "Уроки списаны",
        description: `Списано ${lessonsToDeduct} уроков`,
      })

      setLessonsToDeduct("")
      setDeductReason("")
      setShowDeductLessons(false)
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка списания уроков:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось списать уроки",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetLessons = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.rpc("reset_student_lessons", {
        p_student_id: student.id,
      })

      if (error) throw error

      toast({
        title: "Уроки обнулены",
        description: "Все уроки ученика обнулены",
      })

      setShowResetDialog(false)
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка обнуления уроков:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обнулить уроки",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: "login" | "password") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "login") {
        setCopiedLogin(true)
        setTimeout(() => setCopiedLogin(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
      toast({
        title: "Скопировано",
        description: `${type === "login" ? "Логин" : "Пароль"} скопирован в буфер обмена`,
      })
    } catch (error) {
      console.error("Ошибка копирования:", error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Информация об ученике</DialogTitle>
            <DialogDescription>Просмотр и редактирование данных ученика</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 animate-slide-in">
                <div className="text-3xl font-bold text-primary">{student.total_paid_lessons}</div>
                <div className="text-sm text-muted-foreground mt-1">Всего оплачено</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 animate-slide-in">
                <div className="text-3xl font-bold text-accent">{student.remaining_lessons}</div>
                <div className="text-sm text-muted-foreground mt-1">Осталось уроков</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Учетная запись ученика</h4>
                <div className="flex gap-2">
                  {!student.has_account ? (
                    <Button size="sm" onClick={handleCreateAccount} disabled={loading}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Создать аккаунт
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleRegenerateAccount} disabled={loading}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Перегенерировать
                    </Button>
                  )}
                </div>
              </div>

              {student.has_account && student.student_login && student.student_password && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Логин</Label>
                      <div className="font-mono font-medium">{student.student_login}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(student.student_login!, "login")}>
                      {copiedLogin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Пароль</Label>
                      <div className="font-mono font-medium">{student.student_password}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(student.student_password!, "password")}
                    >
                      {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Управление уроками</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowDeductLessons(!showDeductLessons)}>
                    <Minus className="h-4 w-4 mr-1" />
                    Списать
                  </Button>
                  <Button size="sm" onClick={() => setShowAddLessons(!showAddLessons)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowResetDialog(true)}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Обнулить
                  </Button>
                </div>
              </div>

              {showDeductLessons && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 animate-slide-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="deduct-lessons">Количество уроков</Label>
                      <Input
                        id="deduct-lessons"
                        type="number"
                        min="1"
                        max={student.remaining_lessons}
                        value={lessonsToDeduct}
                        onChange={(e) => setLessonsToDeduct(e.target.value)}
                        placeholder="Введите количество"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deduct-reason">Причина</Label>
                      <Input
                        id="deduct-reason"
                        value={deductReason}
                        onChange={(e) => setDeductReason(e.target.value)}
                        placeholder="Необязательно"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleDeductLessons}
                    disabled={
                      loading || !lessonsToDeduct || Number.parseInt(lessonsToDeduct) > student.remaining_lessons
                    }
                    className="w-full"
                    variant="destructive"
                  >
                    Списать {lessonsToDeduct} {lessonsToDeduct ? "уроков" : ""}
                  </Button>
                </div>
              )}

              {showAddLessons && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 animate-slide-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="lessons">Количество уроков</Label>
                      <Input
                        id="lessons"
                        type="number"
                        min="1"
                        value={lessonsToAdd}
                        onChange={(e) => setLessonsToAdd(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Сумма оплаты (₽)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        onClick={handleAddLessons}
                        disabled={loading || !lessonsToAdd || !paymentAmount}
                        className="w-full"
                      >
                        Добавить уроки
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Активный ученик</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="grid gap-3">
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="hourly_rate">Стоимость урока (₽)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Заметки</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>

            <div className="space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={handleUpdate} disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Обнулить все уроки?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие обнулит все оплаченные уроки и удалит все запланированные занятия ученика. Проведенные уроки
              останутся в истории. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetLessons} className="bg-destructive text-destructive-foreground">
              Обнулить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
