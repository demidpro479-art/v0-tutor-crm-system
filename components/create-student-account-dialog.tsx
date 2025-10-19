"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreateStudentAccountDialogProps {
  studentId: string
  studentName: string
  studentEmail?: string
}

export function CreateStudentAccountDialog({ studentId, studentName, studentEmail }: CreateStudentAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  async function handleCreateAccount() {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Пользователь не авторизован")

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      // Генерируем случайный пароль
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      const email = studentEmail || `student_${studentId.slice(0, 8)}@tutor-crm.local`

      // Создаем учетную запись через Supabase Admin API
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: studentName,
            role: "student",
          },
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/student`,
        },
      })

      if (error) throw error

      if (data.user) {
        const updateData: any = {
          student_id: studentId,
        }

        if (profile?.role === "tutor") {
          updateData.tutor_id = user.id
          console.log("[v0] Ученик создан репетитором, устанавливаем tutor_id:", user.id)
        }

        const { error: profileError } = await supabase.from("profiles").update(updateData).eq("id", data.user.id)

        if (profileError) throw profileError
      }

      setCredentials({ email, password })

      toast({
        title: "Учетная запись создана!",
        description: "Скопируйте данные для входа и отправьте ученику",
      })
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

  function copyCredentials() {
    if (!credentials) return

    const text = `Данные для входа в систему:\n\nЛогин: ${credentials.email}\nПароль: ${credentials.password}\n\nСсылка: ${window.location.origin}/auth/login`
    navigator.clipboard.writeText(text)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    toast({
      title: "Скопировано!",
      description: "Данные скопированы в буфер обмена",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Создать учетную запись</span>
          <span className="sm:hidden">Аккаунт</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Создать учетную запись для ученика</DialogTitle>
          <DialogDescription>
            Создайте учетную запись для {studentName}, чтобы ученик мог видеть свое расписание и статистику
          </DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email для входа</Label>
              <Input value={studentEmail || `student_${studentId.slice(0, 8)}@tutor-crm.local`} disabled />
              <p className="text-xs text-muted-foreground">Пароль будет сгенерирован автоматически</p>
            </div>

            <Button onClick={handleCreateAccount} disabled={loading} className="w-full">
              {loading ? "Создание..." : "Создать учетную запись"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-green-700">Логин</Label>
                <p className="font-mono text-sm font-semibold text-green-900">{credentials.email}</p>
              </div>
              <div>
                <Label className="text-xs text-green-700">Пароль</Label>
                <p className="font-mono text-sm font-semibold text-green-900">{credentials.password}</p>
              </div>
            </div>

            <Button onClick={copyCredentials} className="w-full gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Скопировать данные
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Отправьте эти данные ученику для входа в систему
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
