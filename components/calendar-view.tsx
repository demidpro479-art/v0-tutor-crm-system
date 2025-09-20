"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Clock, ChevronDown, ChevronUp, Minus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { AddLessonDialog } from "./add-lesson-dialog"
import { LessonDetailsDialog } from "./lesson-details-dialog"
import { DeductLessonsDialog } from "./deduct-lessons-dialog"
import { EnhancedRecurringScheduleDialog } from "./enhanced-recurring-schedule-dialog"

interface Lesson {
  id: string
  student_id: string
  title: string
  scheduled_at: string
  duration_minutes: number
  status: string
  lesson_type: string
  price: number
  notes: string
  student_name: string
}

interface Student {
  id: string
  name: string
  remaining_lessons: number
  is_active: boolean
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [showRecurringSchedule, setShowRecurringSchedule] = useState(false)
  const [showDeductLessons, setShowDeductLessons] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const formatTimeForDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    // Отображаем время в пермском часовом поясе
    return date.toLocaleTimeString("ru-RU", {
      timeZone: "Asia/Yekaterinburg",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLessonsForDay = (date: Date | null) => {
    if (!date) return []

    return lessons.filter((lesson) => {
      // Конвертируем время урока в пермское время для сравнения
      const lessonDate = new Date(lesson.scheduled_at)
      const lessonDatePerm = new Date(lessonDate.toLocaleString("en-US", { timeZone: "Asia/Yekaterinburg" }))
      return lessonDatePerm.toDateString() === date.toDateString()
    })
  }

  useEffect(() => {
    fetchData()
  }, [currentDate])

  async function fetchData() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Получаем уроки за текущий месяц
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select(`
          *,
          students!inner(name)
        `)
        .gte("scheduled_at", startOfMonth.toISOString())
        .lte("scheduled_at", endOfMonth.toISOString())
        .order("scheduled_at")

      if (lessonsError) throw lessonsError

      const formattedLessons =
        lessonsData?.map((lesson) => ({
          ...lesson,
          student_name: lesson.students.name,
        })) || []

      setLessons(formattedLessons)

      // Получаем активных учеников
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, remaining_lessons, is_active")
        .eq("is_active", true)
        .order("name")

      if (studentsError) throw studentsError
      setStudents(studentsData || [])
    } catch (error) {
      console.error("Ошибка загрузки данных:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLessonAdded = () => {
    fetchData()
    setShowAddLesson(false)
  }

  const handleLessonUpdated = () => {
    fetchData()
    setSelectedLesson(null)
  }

  const handleScheduleAdded = () => {
    fetchData()
    setShowRecurringSchedule(false)
  }

  const handleLessonsDeducted = () => {
    fetchData()
    setShowDeductLessons(false)
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Добавляем пустые дни в начале месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const toggleDayExpansion = (dateStr: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr)
    } else {
      newExpanded.add(dateStr)
    }
    setExpandedDays(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "cancelled":
        return "bg-red-500"
      case "missed":
        return "bg-orange-500"
      default:
        return "bg-blue-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Проведен"
      case "cancelled":
        return "Отменен"
      case "missed":
        return "Пропущен"
      default:
        return "Запланирован"
    }
  }

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ]

  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Календарь</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => setShowDeductLessons(true)} variant="outline">
              <Minus className="h-4 w-4 mr-2" />
              Списать уроки
            </Button>
            <Button onClick={() => setShowRecurringSchedule(true)} variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Регулярное расписание
            </Button>
            <Button onClick={() => setShowAddLesson(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить урок
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth().map((date, index) => {
              const dayLessons = getLessonsForDay(date)
              const dateStr = date?.toDateString() || ""
              const isExpanded = expandedDays.has(dateStr)
              const hasLessons = dayLessons.length > 0

              return (
                <div
                  key={index}
                  className={`${hasLessons ? "min-h-[160px]" : "min-h-[120px]"} p-2 border rounded-lg ${
                    date ? "bg-card hover:bg-muted/50" : "bg-muted/20"
                  } ${date && date.toDateString() === new Date().toDateString() ? "ring-2 ring-primary" : ""}`}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">{date.getDate()}</div>
                        {hasLessons && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleDayExpansion(dateStr)}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {(isExpanded ? dayLessons : dayLessons.slice(0, 2)).map((lesson) => (
                          <div
                            key={lesson.id}
                            className="text-xs p-2 rounded cursor-pointer hover:shadow-sm transition-all duration-200 border"
                            style={{
                              backgroundColor: `${getStatusColor(lesson.status)}15`,
                              borderColor: `${getStatusColor(lesson.status)}40`,
                            }}
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            <div className="flex items-center space-x-1 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(lesson.status)}`} />
                              <span className="font-medium">{formatTimeForDisplay(lesson.scheduled_at)}</span>
                            </div>
                            <div className="font-medium text-foreground truncate">{lesson.student_name}</div>
                            <div className="text-muted-foreground text-xs">{getStatusText(lesson.status)}</div>
                          </div>
                        ))}

                        {!isExpanded && dayLessons.length > 2 && (
                          <div
                            className="text-xs text-muted-foreground text-center py-1 cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => toggleDayExpansion(dateStr)}
                          >
                            +{dayLessons.length - 2} еще
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <AddLessonDialog
        open={showAddLesson}
        onOpenChange={setShowAddLesson}
        students={students}
        onLessonAdded={handleLessonAdded}
      />

      <EnhancedRecurringScheduleDialog
        open={showRecurringSchedule}
        onOpenChange={setShowRecurringSchedule}
        students={students}
        onScheduleAdded={handleScheduleAdded}
      />

      <DeductLessonsDialog
        open={showDeductLessons}
        onOpenChange={setShowDeductLessons}
        students={students}
        onLessonsDeducted={handleLessonsDeducted}
      />

      {selectedLesson && (
        <LessonDetailsDialog
          lesson={selectedLesson}
          open={!!selectedLesson}
          onOpenChange={(open) => !open && setSelectedLesson(null)}
          onLessonUpdated={handleLessonUpdated}
        />
      )}
    </>
  )
}
