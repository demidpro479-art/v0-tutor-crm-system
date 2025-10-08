"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Undo2, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

interface ActionHistory {
  id: string
  action_type: string
  entity_type: string
  entity_data: any
  created_at: string
}

export function UndoActionPanel() {
  const [actions, setActions] = useState<ActionHistory[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchRecentActions()
  }, [])

  async function fetchRecentActions() {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("action_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setActions(data || [])
    } catch (error) {
      console.error("Ошибка загрузки истории:", error)
    }
  }

  async function undoAction(actionId: string, actionType: string) {
    setLoading(true)
    const supabase = createClient()

    try {
      let functionName = ""

      if (actionType === "delete_student") {
        functionName = "restore_student"
      } else if (actionType === "delete_lesson") {
        functionName = "restore_lesson"
      }

      if (functionName) {
        const { error } = await supabase.rpc(functionName, {
          p_action_id: actionId,
        })

        if (error) throw error

        toast({
          title: "Успешно!",
          description: "Действие отменено",
        })

        fetchRecentActions()
      }
    } catch (error) {
      console.error("Ошибка отмены действия:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отменить действие",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function clearAction(actionId: string) {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("action_history").delete().eq("id", actionId)

      if (error) throw error

      fetchRecentActions()
    } catch (error) {
      console.error("Ошибка удаления действия:", error)
    }
  }

  const getActionDescription = (action: ActionHistory) => {
    if (action.action_type === "delete_student") {
      return `Удален ученик: ${action.entity_data?.name || "Неизвестно"}`
    } else if (action.action_type === "delete_lesson") {
      return `Удален урок`
    }
    return action.action_type
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Undo2 className="h-5 w-5" />
          Последние действия
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => (
            <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">{getActionDescription(action)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: ru })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => undoAction(action.id, action.action_type)}
                  disabled={loading}
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  Отменить
                </Button>
                <Button size="sm" variant="ghost" onClick={() => clearAction(action.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
