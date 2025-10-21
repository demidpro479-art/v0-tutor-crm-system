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
      <Card>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Мои ученики ({students.length})</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Добавить ученика
          </Button>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Нет учеников</h3>
              <p className="text-muted-foreground mb-6">Добавьте первого ученика, чтобы начать работу</p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Добавить ученика
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2"
                  onClick={() => handleStudentClick(student)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{student.full_name}</h3>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end text-sm mb-1">
                            <BookOpen className="h-4 w-4 mr-1 text-blue-600" />
                            <span className="font-bold text-lg text-blue-600">{student.remaining_lessons}</span>
                            <span className="text-muted-foreground ml-1">осталось</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
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
                          className="hover:bg-blue-50"
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
