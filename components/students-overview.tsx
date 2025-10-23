"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, User, Mail, BookOpen, Edit } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AddStudentDialog } from "./add-student-dialog"
import { StudentDetailsDialog } from "./student-details-dialog"
import { toast } from "sonner"

interface Student {
  id: string
  user_id: string
  full_name: string
  email: string
  phone_number?: string
  total_paid_lessons: number
  remaining_lessons: number
  completed_lessons: number
  is_active: boolean
  created_at: string
}

interface StudentsOverviewProps {
  tutorId?: string
}

export function StudentsOverview({ tutorId }: StudentsOverviewProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [tutorId])

  async function fetchStudents() {
    const supabase = createClient()

    try {
      console.log("[v0] StudentsOverview - Загрузка учеников для репетитора:", tutorId)

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Ошибка загрузки учеников:", error)
        toast.error(`Не удалось загрузить учеников: ${error.message}`)
        throw error
      }

      console.log("[v0] StudentsOverview - Загружено учеников:", data?.length || 0)

      const studentsData = (data || []).map((student) => ({
        ...student,
        total_paid_lessons: student.total_paid_lessons || 0,
        completed_lessons: student.completed_lessons || 0,
        remaining_lessons: (student.total_paid_lessons || 0) - (student.completed_lessons || 0),
        is_active: true,
      }))

      setStudents(studentsData)
    } catch (error) {
      console.error("[v0] Ошибка загрузки учеников:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = (student: Student) => {
    console.log("[v0] Клик на ученика:", student.id)
    setSelectedStudent(student)
  }

  if (loading) {
    return (
      <Card className="glass-effect dark:glass-effect-dark border-2">
        <CardHeader>
          <CardTitle>Ученики</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="glass-effect dark:glass-effect-dark border-2">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Мои ученики
            </CardTitle>
            <p className="text-sm text-muted-foreground">Всего учеников: {students.length}</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить ученика
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {students.length === 0 ? (
            <div className="text-center py-16">
              <div className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Нет учеников
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Добавьте первого ученика, чтобы начать работу и отслеживать прогресс
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Добавить первого ученика
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <Card
                  key={student.id}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-blue-300 dark:hover:border-blue-700 bg-gradient-to-r from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/30"
                  onClick={() => handleStudentClick(student)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <User className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {student.full_name}
                          </h3>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1.5" />
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {student.remaining_lessons}
                            </span>
                            <span className="text-sm text-muted-foreground">осталось</span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                            Оплачено: {student.total_paid_lessons} • Проведено: {student.completed_lessons}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStudentClick(student)
                          }}
                          className="hover:bg-blue-50 dark:hover:bg-blue-950 border-2 hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddStudentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onStudentAdded={() => {
          fetchStudents()
          setShowAddDialog(false)
        }}
        tutorId={tutorId}
      />

      {selectedStudent && (
        <StudentDetailsDialog
          student={selectedStudent}
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          onStudentUpdated={() => {
            fetchStudents()
            setSelectedStudent(null)
          }}
        />
      )}
    </>
  )
}
