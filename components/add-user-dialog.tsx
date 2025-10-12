"use client"

import type React from "react"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "tutor",
    rate_per_lesson: "",
    lesson_price: "",
  })
  const { toast } = useToast()
  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Создаем пользователя
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        })
        .select()
        .single()

      if (userError) throw userError

      // Если это репетитор, создаем настройки
      if (formData.role === "tutor" && user) {
        const { error: settingsError } = await supabase.from("tutor_settings").insert({
          user_id: user.id,
          rate_per_lesson: Number.parseFloat(formData.rate_per_lesson) || 0,
          lesson_price: Number.parseFloat(formData.lesson_price) || 0,
        })

        if (settingsError) throw settingsError
      }

      toast({
        title: "Успешно",
        description: "Пользователь добавлен",
      })

      onOpenChange(false)
      setFormData({
        email: "",
        full_name: "",
        role: "tutor",
        rate_per_lesson: "",
        lesson_price: "",
      })
      window.location.reload()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить пользователя</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Полное имя</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
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
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson_price">Цена урока для клиента (₽)</Label>
                <Input
                  id="lesson_price"
                  type="number"
                  value={formData.lesson_price}
                  onChange={(e) => setFormData({ ...formData, lesson_price: e.target.value })}
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Добавление..." : "Добавить"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
