"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, User, Search, Filter } from "lucide-react"
import { StudentsByTutor } from "@/components/students-by-tutor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditStudentProfileDialog } from "@/components/edit-student-profile-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTutor, setFilterTutor] = useState<string>("all")

  console.log("[v0] StudentsTable - Received students:", {
    total: students.length,
    withTutor: students.filter((s) => s.tutor_id !== null).length,
    withoutTutor: students.filter((s) => s.tutor_id === null).length,
    sampleStudent: students[0],
  })

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTutor =
      filterTutor === "all" || (filterTutor === "none" && student.tutor_id === null) || student.tutor_id === filterTutor

    return matchesSearch && matchesTutor
  })

  const tutorsWithStudents = tutors.map((tutor) => ({
    ...tutor,
    students: students.filter((s) => s.tutor_id === tutor.id),
  }))

  return (
    <>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="glass-effect dark:glass-effect-dark p-1.5 rounded-xl h-auto gap-2">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
          >
            Все ученики ({students.length})
          </TabsTrigger>
          <TabsTrigger
            value="by-tutor"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
          >
            По репетиторам
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="glass-effect dark:glass-effect-dark border-2">
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени или email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-900 border-2"
                  />
                </div>
                <div className="w-full md:w-64">
                  <Select value={filterTutor} onValueChange={setFilterTutor}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 border-2">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Фильтр по репетитору" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900">
                      <SelectItem value="all">Все репетиторы</SelectItem>
                      <SelectItem value="none">Без репетитора</SelectItem>
                      {tutors.map((tutor) => (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {filteredStudents.length === students.length
                    ? `Все ученики (${students.length})`
                    : `Найдено: ${filteredStudents.length} из ${students.length}`}
                </h3>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <User className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Ученики не найдены</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || filterTutor !== "all"
                      ? "Попробуйте изменить параметры поиска"
                      : "Нет учеников в системе"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredStudents.map((student) => (
                    <Card
                      key={student.id}
                      className="group p-5 hover:shadow-xl transition-all duration-300 border-2 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer bg-gradient-to-r from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/30"
                      onClick={() => {
                        console.log("[v0] Клик на ученика:", student)
                        setEditingStudent(student)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 border-2 border-indigo-200 dark:border-indigo-800 group-hover:scale-110 transition-transform duration-300">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold">
                              {student.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {student.full_name}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mt-1">
                              <span>{student.email}</span>
                              {student.phone_number && (
                                <>
                                  <span>•</span>
                                  <span>{student.phone_number}</span>
                                </>
                              )}
                            </div>
                            {student.tutor?.full_name ? (
                              <Badge
                                variant="secondary"
                                className="mt-2 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                              >
                                Репетитор: {student.tutor.full_name}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="mt-2 text-xs border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950"
                              >
                                Без репетитора
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <BookOpen className="h-4 w-4" />
                              <span>Оплачено: {student.total_paid_lessons || 0}</span>
                            </div>
                            <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              Осталось: {student.remaining_lessons || 0}
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

      {editingStudent && (
        <EditStudentProfileDialog
          open={!!editingStudent}
          onOpenChange={(open) => !open && setEditingStudent(null)}
          student={editingStudent}
          onStudentUpdated={() => {
            setEditingStudent(null)
            if (onUpdate) onUpdate()
          }}
        />
      )}
    </>
  )
}
