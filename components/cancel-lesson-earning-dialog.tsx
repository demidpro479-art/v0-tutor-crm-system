"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { XCircle } from "lucide-react"
import { toast } from "sonner"

interface CancelLessonEarningDialogProps {
  lessonId: string
  onSuccess?: () => void
}

export function CancelLessonEarningDialog({ lessonId, onSuccess }: CancelLessonEarningDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleCancel() {
    if (!reason.trim()) {
      toast.error("Укажите причину отмены")
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.rpc("cancel_lesson_earning", {
        p_lesson_id: lessonId,
        p_cancelled_by: user.id,
        p_reason: reason,
      })

      if (error) throw error

      toast.success("Начисление за урок отменено")
      setOpen(false)
      setReason("")
      onSuccess?.()
    } catch (error) {
      console.error("Error cancelling lesson earning:", error)
      toast.error("Ошибка при отмене начисления")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircle className="h-4 w-4 mr-2" />
          Отменить начисление
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отменить начисление за урок</DialogTitle>
          <DialogDescription>
            Это действие отменит начисление заработка репетитору за этот урок. Укажите причину отмены.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Причина отмены</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: Урок не состоялся, технические проблемы..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? "Отмена..." : "Отменить начисление"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
