"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, User, GraduationCap, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Student {
  id: string
  name: string
  email: string
  phone: string
  total_paid_lessons: number
  remaining_lessons: number
  tutor_id: string
}

interface Tutor {
  id: string
  full_name: string
  email: string
  students: Student[]
}

interface StudentsByTutorProps {
  tutors: Tutor[]
}

export function StudentsByTutor({ tutors }: StudentsByTutorProps) {
  const [expandedTutors, setExpandedTutors] = useState<Set<string>>(new Set())

  const toggleTutor = (tutorId: string) => {
    const newExpanded = new Set(expandedTutors)
    if (newExpanded.has(tutorId)) {
      newExpanded.delete(tutorId)
    } else {
      newExpanded.add(tutorId)
    }
    setExpandedTutors(newExpanded)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ученики по репетиторам</h2>
          <p className="text-slate-600">Просмотр учеников каждого репетитора</p>
        </div>
      </div>

      <div className="space-y-3">
        {tutors.map((tutor) => {
          const isExpanded = expandedTutors.has(tutor.id)
          const studentCount = tutor.students?.length || 0

          return (
            <Card
              key={tutor.id}
              className="overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-primary"
            >
              <Button
                variant="ghost"
                className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                onClick={() => toggleTutor(tutor.id)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {tutor.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{tutor.full_name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Репетитор
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{tutor.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {studentCount} {studentCount === 1 ? "ученик" : studentCount < 5 ? "ученика" : "учеников"}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-400 transition-transform" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform" />
                  )}
                </div>
              </Button>

              {isExpanded && (
                <div className="border-t bg-slate-50/50 p-6 animate-slide-in">
                  {studentCount === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>У этого репетитора пока нет учеников</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {tutor.students.map((student) => (
                        <Card
                          key={student.id}
                          className="p-4 hover:shadow-md transition-all duration-200 bg-white border-l-2 border-l-blue-400"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-slate-200">
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-slate-900">{student.name}</h4>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                  <span>{student.email}</span>
                                  {student.phone && (
                                    <>
                                      <span>•</span>
                                      <span>{student.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <BookOpen className="h-4 w-4" />
                                  <span>Оплачено: {student.total_paid_lessons}</span>
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                  Осталось: {student.remaining_lessons}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {tutors.length === 0 && (
        <Card className="p-12 text-center">
          <GraduationCap className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Нет репетиторов</h3>
          <p className="text-slate-600">Добавьте репетиторов для начала работы</p>
        </Card>
      )}
    </div>
  )
}
