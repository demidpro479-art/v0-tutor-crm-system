"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, BookOpen, TrendingUp, Award, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  student_id: string | null
}

interface StudentData {
  id: string
  name: string
  remaining_lessons: number
  total_paid_lessons: number
}

interface Lesson {
  id: string
  title: string | null
  scheduled_at: string
  status: string
  grade: number | null
  homework: string | null
  duration_minutes: number
}

export function StudentDashboard({
  userId,
  profile,
  studentData: initialStudentData,
}: {
  userId: string
  profile: Profile
  studentData?: StudentData
}) {
  const [student, setStudent] = useState<StudentData | null>(initialStudentData || null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [nickname, setNickname] = useState(profile.full_name || "")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    if (!profile.full_name) {
      setShowNicknameDialog(true)
    }
  }, [])

  async function handleSetNickname() {
    if (!nickname.trim()) return

    try {
      const { error } = await supabase.rpc("set_student_nickname", {
        p_user_id: userId,
        p_nickname: nickname.trim(),
      })

      if (error) throw error

      setShowNicknameDialog(false)
      window.location.reload()
    } catch (error) {
      console.error("[v0] Ошибка установки никнейма:", error)
    }
  }

  async function loadData() {
    if (!student && profile.student_id) {
      const { data: studentData } = await supabase.from("students").select("*").eq("id", profile.student_id).single()

      if (studentData) {
        setStudent(studentData)
      }
    }

    if (profile.student_id) {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", profile.student_id)
        .order("scheduled_at", { ascending: false })

      if (lessonsData) {
        setLessons(lessonsData)
      }
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  function formatActualTime(scheduledAt: string): string {
    const date = new Date(scheduledAt)
    date.setHours(date.getHours() - 2)
    return date.toLocaleString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const displayName = profile.full_name || student?.name || "Ученик"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Профиль не настроен</CardTitle>
            <CardDescription>Ваш профиль ученика еще не создан. Обратитесь к репетитору.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent">
              Выйти
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedLessons = lessons.filter((l) => l.status === "completed")
  const missedLessons = lessons.filter((l) => l.status === "missed")
  const upcomingLessons = lessons.filter((l) => l.status === "scheduled" && new Date(l.scheduled_at) > new Date())

  const averageGrade =
    completedLessons.filter((l) => l.grade).length > 0
      ? (
          completedLessons.reduce((sum, l) => sum + (l.grade || 0), 0) / completedLessons.filter((l) => l.grade).length
        ).toFixed(1)
      : "—"

  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const count = completedLessons.filter((l) => {
      const date = new Date(l.scheduled_at)
      return date >= weekStart && date < weekEnd
    }).length

    return {
      week: `Нед ${i + 1}`,
      lessons: count,
    }
  })

  const statusData = [
    { name: "Проведено", value: completedLessons.length, color: "#10b981" },
    { name: "Пропущено", value: missedLessons.length, color: "#ef4444" },
    { name: "Запланировано", value: upcomingLessons.length, color: "#3b82f6" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {showNicknameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Добро пожаловать!</h2>
            <p className="text-gray-600 mb-4">Установите свой никнейм для личного кабинета</p>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите никнейм"
              className="mb-4"
            />
            <Button onClick={handleSetNickname} disabled={!nickname.trim()} className="w-full">
              Сохранить
            </Button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="hidden sm:block min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="shrink-0 bg-transparent text-xs sm:text-sm px-2 sm:px-4"
          >
            Выйти
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 space-y-4 sm:space-y-6">
        <div className="sm:hidden">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Привет, {displayName.split(" ")[0]}! 👋</h1>
          <p className="text-gray-600">Твоя статистика обучения</p>
        </div>

        <div className="hidden sm:block">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Привет, {displayName.split(" ")[0]}! 👋</h1>
          <p className="text-lg text-gray-600">Твоя статистика обучения</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{student.remaining_lessons}</div>
              <div className="text-xs md:text-sm opacity-90">Уроков осталось</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{completedLessons.length}</div>
              <div className="text-xs md:text-sm opacity-90">Проведено</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{averageGrade}</div>
              <div className="text-xs md:text-sm opacity-90">Средняя оценка</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{missedLessons.length}</div>
              <div className="text-xs md:text-sm opacity-90">Пропущено</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Частота уроков
              </CardTitle>
              <CardDescription className="text-sm">Последние 8 недель</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px] md:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="lessons"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Статистика уроков
              </CardTitle>
              <CardDescription className="text-sm">Распределение по статусам</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px] md:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={window.innerWidth < 768 ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="px-4 py-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Ближайшие уроки
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Запланированные занятия</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            {upcomingLessons.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Нет запланированных уроков</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {upcomingLessons.slice(0, 5).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                        {lesson.title || "Урок"}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600">{formatActualTime(lesson.scheduled_at)}</p>
                    </div>
                    <Badge variant="secondary" className="self-start sm:self-center shrink-0 text-xs">
                      {lesson.duration_minutes} мин
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="px-4 py-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              История уроков
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Оценки и домашние задания</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            {completedLessons.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Пока нет проведенных уроков</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {completedLessons.slice(0, 10).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                          {lesson.title || "Урок"}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">{formatActualTime(lesson.scheduled_at)}</p>
                      </div>
                      {lesson.grade && (
                        <Badge
                          className={`shrink-0 text-xs ${
                            lesson.grade >= 4
                              ? "bg-green-500 hover:bg-green-600"
                              : lesson.grade === 3
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          Оценка: {lesson.grade}
                        </Badge>
                      )}
                    </div>
                    {lesson.homework && (
                      <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded text-sm sm:text-sm">
                        <p className="font-medium text-blue-900 mb-1">Домашнее задание:</p>
                        <p className="text-blue-800 whitespace-pre-wrap break-words">{lesson.homework}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
