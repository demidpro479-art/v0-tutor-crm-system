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
import { Plus, Trash2, Minus, RotateCcw, Edit2 } from "lucide-react"
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
  const [showEditTotal, setShowEditTotal] = useState(false)
  const [newTotalLessons, setNewTotalLessons] = useState(student.total_paid_lessons.toString())
  const [showEditRemaining, setShowEditRemaining] = useState(false)
  const [newRemainingLessons, setNewRemainingLessons] = useState(student.remaining_lessons.toString())
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

      console.log("[v0] Добавление уроков:", {
        studentId: student.id,
        amount: Number.parseInt(lessonsToAdd),
      })

      const { error } = await supabase.rpc("add_paid_lessons", {
        p_student_id: student.id,
        p_amount: Number.parseInt(lessonsToAdd),
      })

      if (error) {
        console.error("[v0] Ошибка от Supabase:", error)
        throw error
      }

      // Добавляем запись о платеже
      await supabase.from("payments").insert({
        student_id: student.id,
        amount: Number.parseFloat(paymentAmount),
        lessons_purchased: Number.parseInt(lessonsToAdd),
        payment_date: new Date().toISOString(),
        notes: `Добавлено ${lessonsToAdd} уроков`,
      })

      console.log("[v0] Уроки успешно добавлены")

      toast({
        title: "Уроки добавлены",
        description: `Добавлено ${lessonsToAdd} уроков на сумму ${paymentAmount}₽`,
      })

      setLessonsToAdd("")
      setPaymentAmount("")
      setShowAddLessons(false)
      onStudentUpdated()
    } catch (error) {
      console.error("[v0] Ошибка добавления уроков:", error)
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

      console.log("[v0] Удаление ученика:", student.id)

      const { error } = await supabase.from("students").delete().eq("id", student.id)

      if (error) {
        console.error("[v0] Ошибка от Supabase:", error)
        throw error
      }

      console.log("[v0] Ученик успешно удален")

      toast({
        title: "Ученик удален",
        description: "Ученик успешно удален из системы",
      })

      onStudentUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Ошибка удаления ученика:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить ученика",
        variant: "destructive",
      })
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

      console.log("[v0] Списание уроков:", {
        studentId: student.id,
        amount: Number.parseInt(lessonsToDeduct),
      })

      const { error } = await supabase.rpc("deduct_paid_lessons", {
        p_student_id: student.id,
        p_amount: Number.parseInt(lessonsToDeduct),
      })

      if (error) {
        console.error("[v0] Ошибка от Supabase:", error)
        throw error
      }

      console.log("[v0] Уроки успешно списаны")

      toast({
        title: "Уроки списаны",
        description: `Списано ${lessonsToDeduct} уроков`,
      })

      setLessonsToDeduct("")
      setDeductReason("")
      setShowDeductLessons(false)
      onStudentUpdated()
    } catch (error) {
      console.error("[v0] Ошибка списания уроков:", error)
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

      const { error } = await supabase.rpc("reset_all_lessons", {
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

  const handleUpdateTotalLessons = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const newTotal = Number.parseInt(newTotalLessons)
      if (isNaN(newTotal) || newTotal < 0) {
        throw new Error("Введите корректное число")
      }

      const { error } = await supabase.rpc("set_total_paid_lessons", {
        p_student_id: student.id,
        p_amount: newTotal,
      })

      if (error) throw error

      toast({
        title: "Обновлено",
        description: `Общее количество оплаченных уроков изменено на ${newTotal}`,
      })

      setShowEditTotal(false)
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка обновления количества уроков:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить количество уроков",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRemainingLessons = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const newRemaining = Number.parseInt(newRemainingLessons)
      if (isNaN(newRemaining) || newRemaining < 0) {
        throw new Error("Введите корректное число")
      }

      console.log("[v0] Обновление оставшихся уроков:", {
        studentId: student.id,
        newRemaining: newRemaining,
      })

      const { error } = await supabase.rpc("set_remaining_lessons", {
        p_student_id: student.id,
        p_amount: newRemaining,
      })

      if (error) {
        console.error("[v0] Ошибка от Supabase:", error)
        throw error
      }

      console.log("[v0] Оставшиеся уроки успешно обновлены")

      toast({
        title: "Обновлено",
        description: `Количество оставшихся уроков изменено на ${newRemaining}`,
      })

      setShowEditRemaining(false)
      onStudentUpdated()
    } catch (error) {
      console.error("[v0] Ошибка обновления количества уроков:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить количество уроков",
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Информация об ученике
            </DialogTitle>
            <DialogDescription>Просмотр и редактирование данных ученика</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="text-center p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-2xl border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 animate-slide-in">
                  <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {student.total_paid_lessons}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 font-medium">Всего оплачено</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 h-8 text-xs hover:bg-primary/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEditTotal(!showEditTotal)
                      setNewTotalLessons(student.total_paid_lessons.toString())
                    }}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Изменить
                  </Button>
                </div>
              </div>

              <div className="relative group">
                <div className="text-center p-6 bg-gradient-to-br from-accent/20 via-accent/10 to-accent/5 rounded-2xl border-2 border-accent/30 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 animate-slide-in">
                  <div className="text-4xl font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                    {student.remaining_lessons}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 font-medium">Осталось уроков</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 h-8 text-xs hover:bg-accent/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEditRemaining(!showEditRemaining)
                      setNewRemainingLessons(student.remaining_lessons.toString())
                    }}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Изменить
                  </Button>
                </div>
              </div>
            </div>

            {showEditTotal && (
              <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-3 animate-slide-in">
                <Label htmlFor="total-lessons" className="text-sm font-semibold">
                  Общее количество оплаченных уроков
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="total-lessons"
                    type="number"
                    min="0"
                    value={newTotalLessons}
                    onChange={(e) => setNewTotalLessons(e.target.value)}
                    placeholder="Введите количество"
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateTotalLessons} disabled={loading} size="sm">
                    Сохранить
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditTotal(false)} size="sm">
                    Отмена
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Изменение этого значения автоматически пересчитает количество оставшихся уроков
                </p>
              </div>
            )}

            {showEditRemaining && (
              <div className="p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl border border-accent/20 space-y-3 animate-slide-in">
                <Label htmlFor="remaining-lessons" className="text-sm font-semibold">
                  Количество оставшихся уроков
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="remaining-lessons"
                    type="number"
                    min="0"
                    value={newRemainingLessons}
                    onChange={(e) => setNewRemainingLessons(e.target.value)}
                    placeholder="Введите количество"
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateRemainingLessons} disabled={loading} size="sm">
                    Сохранить
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditRemaining(false)} size="sm">
                    Отмена
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Изменение этого значения автоматически пересчитает общее количество оплаченных уроков
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-lg">Управление уроками</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeductLessons(!showDeductLessons)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Списать
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddLessons(!showAddLessons)}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowResetDialog(true)
                    }}
                    className="hover:bg-destructive/90 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Обнулить
                  </Button>
                </div>
              </div>

              {showDeductLessons && (
                <div className="p-4 bg-gradient-to-r from-destructive/5 to-destructive/10 rounded-xl border border-destructive/20 space-y-3 animate-slide-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="deduct-lessons" className="text-sm font-medium">
                        Количество уроков
                      </Label>
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
                      <Label htmlFor="deduct-reason" className="text-sm font-medium">
                        Причина
                      </Label>
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
                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-3 animate-slide-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="lessons" className="text-sm font-medium">
                        Количество уроков
                      </Label>
                      <Input
                        id="lessons"
                        type="number"
                        min="1"
                        value={lessonsToAdd}
                        onChange={(e) => setLessonsToAdd(e.target.value)}
                        placeholder="Введите количество"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">
                        Сумма оплаты (₽)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Введите сумму"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddLessons}
                    disabled={loading || !lessonsToAdd || !paymentAmount}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Добавить уроки
                  </Button>
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
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Обнулить все уроки?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие обнулит все оплаченные уроки и удалит все запланированные занятия ученика. Проведенные уроки
              останутся в истории. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation()
                handleResetLessons()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Обнулить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
