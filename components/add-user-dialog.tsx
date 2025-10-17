"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createUser } from "@/app/actions/create-user"
import { Copy, Check } from "lucide-react"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserAdded?: () => void
}

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "tutor" as "admin" | "tutor" | "manager",
    rate_per_lesson: "",
    lesson_price: "",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneratedPassword(null)

    try {
      const result = await createUser({
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        rate_per_lesson: formData.rate_per_lesson ? Number.parseFloat(formData.rate_per_lesson) : undefined,
        lesson_price: formData.lesson_price ? Number.parseFloat(formData.lesson_price) : undefined,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Показываем сгенерированный пароль
      setGeneratedPassword(result.password!)

      toast({
        title: "Успешно",
        description: "Пользователь создан. Сохраните пароль!",
      })

      // Вызываем callback для обновления списка
      if (onUserAdded) {
        onUserAdded()
      }
    } catch (error: any) {
      console.error("[v0] Ошибка создания пользователя:", error)
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Сбрасываем форму после закрытия
    setTimeout(() => {
      setFormData({
        email: "",
        full_name: "",
        role: "tutor",
        rate_per_lesson: "",
        lesson_price: "",
      })
      setGeneratedPassword(null)
      setCopied(false)
    }, 300)
  }

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Скопировано",
        description: "Пароль скопирован в буфер обмена",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Добавить пользователя</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border-2 border-green-200 p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">Пользователь успешно создан!</p>
              <p className="text-xs text-green-700 mb-3">
                Email: <span className="font-mono font-bold">{formData.email}</span>
              </p>
              <div className="space-y-2">
                <Label className="text-green-900">Сгенерированный пароль:</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedPassword}
                    readOnly
                    className="font-mono font-bold text-lg bg-white border-green-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    className="shrink-0 border-green-300 hover:bg-green-100 bg-transparent"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-3 font-semibold">
                ⚠️ ВАЖНО: Сохраните этот пароль! Он больше не будет показан.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Закрыть
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Полное имя</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Иван Иванов"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "tutor" | "manager") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutor">Репетитор</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "tutor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rate_per_lesson">Ставка за урок (₽)</Label>
                  <Input
                    id="rate_per_lesson"
                    type="number"
                    value={formData.rate_per_lesson}
                    onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })}
                    placeholder="500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson_price">Цена урока для клиента (₽)</Label>
                  <Input
                    id="lesson_price"
                    type="number"
                    value={formData.lesson_price}
                    onChange={(e) => setFormData({ ...formData, lesson_price: e.target.value })}
                    placeholder="750"
                  />
                </div>
              </>
            )}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                💡 Пароль будет сгенерирован автоматически и показан после создания пользователя
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Создание..." : "Создать пользователя"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
