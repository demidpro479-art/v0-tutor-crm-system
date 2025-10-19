"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, User } from "lucide-react"
import { StudentsByTutor } from "@/components/students-by-tutor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Student {
  id: string
  full_name: string
  email: string
  phone_number?: string
  total_paid_lessons: number
  remaining_lessons: number
  tutor_id: string | null
  tutor?: {
    full_name: string
  }
}

interface Tutor {
  id: string
  full_name: string
  email: string
}

interface StudentsTableProps {
  students: Student[]
  tutors: Tutor[]
  onUpdate?: () => void
}

export function StudentsTable({ students, tutors, onUpdate }: StudentsTableProps) {
  console.log("[v0] StudentsTable - Received students:", {
    total: students.length,
    withTutor: students.filter((s) => s.tutor_id !== null).length,
    withoutTutor: students.filter((s) => s.tutor_id === null).length,
    sampleStudent: students[0],
  })

  const tutorsWithStudents = tutors.map((tutor) => ({
    ...tutor,
    students: students.filter((s) => s.tutor_id === tutor.id),
  }))

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all">Все ученики ({students.length})</TabsTrigger>
        <TabsTrigger value="by-tutor">По репетиторам</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <Card className="p-6 bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Все ученики ({students.length})</h3>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Нет учеников в системе</p>
                <p className="text-xs mt-2 text-orange-600 font-medium">
                  Откройте консоль браузера (F12 → Console) для debug информации
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {students.map((student) => (
                  <Card
                    key={student.id}
                    className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary cursor-pointer"
                    onClick={() => {
                      if (onUpdate) {
                        // TODO: Открыть диалог редактирования ученика
                        console.log("[v0] Клик на ученика:", student)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {student.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-slate-900">{student.full_name}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>{student.email}</span>
                            {student.phone_number && (
                              <>
                                <span>•</span>
                                <span>{student.phone_number}</span>
                              </>
                            )}
                          </div>
                          {student.tutor?.full_name ? (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Репетитор: {student.tutor.full_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="mt-1 text-xs border-orange-300 text-orange-700">
                              Без репетитора
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <BookOpen className="h-4 w-4" />
                            <span>Оплачено: {student.total_paid_lessons || 0}</span>
                          </div>
                          <div className="text-sm font-semibold text-primary">
                            Осталось: {(student.total_paid_lessons || 0) - (student.remaining_lessons || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="by-tutor">
        <StudentsByTutor tutors={tutorsWithStudents} students={students} />
      </TabsContent>
    </Tabs>
  )
}
