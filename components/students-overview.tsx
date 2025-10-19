"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, User, Mail, BookOpen, DollarSign } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AddStudentDialog } from "./add-student-dialog"
import { StudentDetailsDialog } from "./student-details-dialog"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: string
  user_id: string
  full_name: string
  email: string
  total_paid_lessons: number
  remaining_lessons: number
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
  const { toast } = useToast()

  useEffect(() => {
    fetchStudents()
  }, [tutorId])

  async function fetchStudents() {
    const supabase = createClient()

    try {
      console.log("[v0] StudentsOverview - Загрузка учеников для репетитора:", tutorId)

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, created_at")
        .eq("role", "student")
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Ошибка загрузки учеников:", error)
        toast({
          title: "Ошибка",
          description: `Не удалось загрузить учеников: ${error.message}`,
          variant: "destructive",
        })
        throw error
      }

      console.log("[v0] StudentsOverview - Загружено учеников:", data?.length || 0)

      const studentsWithLessons = await Promise.all(
        (data || []).map(async (student) => {
          const { data: paymentsData } = await supabase
            .from("payments")
            .select("lessons_purchased")
            .eq("student_id", student.id)

          const totalPaid = paymentsData?.reduce((sum, p) => sum + (p.lessons_purchased || 0), 0) || 0

          const { count: completedCount } = await supabase
            .from("lessons")
            .select("*", { count: "only", head: true })
            .eq("student_id", student.id)
            .eq("status", "completed")

          return {
            ...student,
            total_paid_lessons: totalPaid,
            remaining_lessons: totalPaid - (completedCount || 0),
            is_active: true,
          }
        }),
      )

      setStudents(studentsWithLessons)
    } catch (error) {
      console.error("[v0] Ошибка загрузки учеников:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStudentAdded = () => {
    console.log("[v0] Обновление списка учеников после добавления")
    fetchStudents()
    setShowAddDialog(false)
  }

  const handleStudentUpdated = () => {
    console.log("[v0] Обновление списка учеников после изменения")
    fetchStudents()
    setSelectedStudent(null)
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
          <CardTitle>Ученики ({students.length})</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить ученика
          </Button>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет учеников</h3>
              <p className="text-muted-foreground mb-4">Добавьте первого ученика, чтобы начать работу</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить ученика
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedStudent(student)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{student.full_name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {student.email && (
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {student.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center text-sm">
                            <BookOpen className="h-3 w-3 mr-1" />
                            <span className="font-medium">{student.remaining_lessons}</span>
                            <span className="text-muted-foreground ml-1">уроков</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3 mr-1" />
                            <span>Оплачено: {student.total_paid_lessons}</span>
                          </div>
                        </div>

                        <Badge variant={student.is_active ? "default" : "secondary"}>
                          {student.is_active ? "Активен" : "Неактивен"}
                        </Badge>
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
