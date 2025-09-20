"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"

interface PendingLesson {
  id: string
  student_id: string
  title: string
  scheduled_at: string
  status: string
  student_name: string
  duration_minutes: number
}

export function LessonAutoProcessor() {
  const [pendingLessons, setPendingLessons] = useState<PendingLesson[]>([])
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingLessons()

    // Автоматически обновляем каждые 5 минут
    const interval = setInterval(fetchPendingLessons, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPendingLessons() {
    const supabase = createClient()

    try {
      // Получаем уроки, которые прошли более часа назад и еще не обработаны
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data, error } = await supabase
        .from("lessons")
        .select(`
          *,
          students!inner(name)
        `)
        .eq("status", "scheduled")
        .lt("scheduled_at", oneHourAgo.toISOString())
        .order("scheduled_at", { ascending: false })

      if (error) throw error

      const formattedLessons =
        data?.map((lesson) => ({
          ...lesson,
          student_name: lesson.students.name,
        })) || []

      setPendingLessons(formattedLessons)
    } catch (error) {
      console.error("Ошибка загрузки уроков для обработки:", error)
    } finally {
      setLoading(false)
    }
  }

  async function processLessons(action: string) {
    if (selectedLessons.length === 0) return

    setProcessing(true)

    try {
      const response = await fetch("/api/lessons/bulk-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonIds: selectedLessons,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error("Ошибка обработки уроков")
      }

      const result = await response.json()

      if (result.success) {
        // Обновляем список уроков
        await fetchPendingLessons()
        setSelectedLessons([])
      }
    } catch (error) {
      console.error("Ошибка обработки уроков:", error)
    } finally {
      setProcessing(false)
    }
  }

  async function runAutomaticProcessing() {
    setProcessing(true)

    try {
      const response = await fetch("/api/cron/process-lessons", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Ошибка автоматической обработки")
      }

      const result = await response.json()

      if (result.success) {
        await fetchPendingLessons()
      }
    } catch (error) {
      console.error("Ошибка автоматической обработки:", error)
    } finally {
      setProcessing(false)
    }
  }

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons((prev) => (prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]))
  }

  const selectAllLessons = () => {
    setSelectedLessons(
      selectedLessons.length === pendingLessons.length ? [] : pendingLessons.map((lesson) => lesson.id),
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Автоматическая обработка уроков</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Автоматическая обработка уроков</span>
          {pendingLessons.length > 0 && <Badge variant="secondary">{pendingLessons.length}</Badge>}
        </CardTitle>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchPendingLessons} disabled={processing}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
          <Button size="sm" onClick={runAutomaticProcessing} disabled={processing}>
            Автообработка
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {pendingLessons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">Все уроки обработаны</h3>
            <p>Нет уроков, требующих обработки</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedLessons.length === pendingLessons.length}
                  onCheckedChange={selectAllLessons}
                />
                <span className="text-sm">
                  Выбрать все ({selectedLessons.length} из {pendingLessons.length})
                </span>
              </div>

              {selectedLessons.length > 0 && (
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => processLessons("complete")} disabled={processing}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Провести
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processLessons("mark_missed")}
                    disabled={processing}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Пропущен
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => processLessons("cancel")} disabled={processing}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Отменить
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {pendingLessons.map((lesson) => (
                <Card key={lesson.id} className="p-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedLessons.includes(lesson.id)}
                      onCheckedChange={() => toggleLessonSelection(lesson.id)}
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{lesson.student_name}</h4>
                          <p className="text-sm text-muted-foreground">{lesson.title || "Урок"}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {new Date(lesson.scheduled_at).toLocaleDateString("ru-RU")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(lesson.scheduled_at).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Прошло: {Math.round((Date.now() - new Date(lesson.scheduled_at).getTime()) / (1000 * 60 * 60))}{" "}
                        часов назад
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
