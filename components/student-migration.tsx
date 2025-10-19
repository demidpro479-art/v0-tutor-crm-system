"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface StudentMigrationProps {
  students: any[]
  tutors: any[]
  onMigrationComplete: () => void
}

export function StudentMigration({ students, tutors, onMigrationComplete }: StudentMigrationProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [targetTutor, setTargetTutor] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  console.log("[v0] StudentMigration - Received data:", {
    totalStudents: students.length,
    sampleStudent: students[0],
    tutors: tutors.length,
    studentsWithNullTutor: students.filter((s) => s.tutor_id === null).length,
    studentsWithUndefinedTutor: students.filter((s) => s.tutor_id === undefined).length,
    studentsWithEmptyTutor: students.filter((s) => !s.tutor_id).length,
  })

  const studentsWithoutTutor = students.filter((s) => s.tutor_id === null || s.tutor_id === undefined)
  const studentsWithTutor = students.filter((s) => s.tutor_id !== null && s.tutor_id !== undefined)

  console.log("[v0] StudentMigration - Filtered students:", {
    withoutTutor: studentsWithoutTutor.length,
    withTutor: studentsWithTutor.length,
    sampleWithoutTutor: studentsWithoutTutor[0],
    sampleWithTutor: studentsWithTutor[0],
  })

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleMigration = async () => {
    if (selectedStudents.length === 0 || !targetTutor) {
      toast({
        title: "Ошибка",
        description: "Выберите учеников и репетитора",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      console.log("[v0] StudentMigration - Migrating students:", {
        selectedStudents,
        targetTutor,
      })

      const { error } = await supabase.from("profiles").update({ tutor_id: targetTutor }).in("id", selectedStudents)

      if (error) throw error

      toast({
        title: "Успешно",
        description: `${selectedStudents.length} учеников перенесено`,
      })

      setSelectedStudents([])
      setTargetTutor("")
      onMigrationComplete()
    } catch (error) {
      console.error("[v0] Migration error:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось перенести учеников",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-orange-100 p-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-orange-900">Ученики без репетитора</h3>
            <p className="text-sm text-orange-700">Требуется назначение репетитора</p>
          </div>
          <Badge variant="secondary" className="ml-auto bg-orange-200 text-orange-900">
            {studentsWithoutTutor.length}
          </Badge>
        </div>

        {studentsWithoutTutor.length === 0 ? (
          <div className="text-center py-8 text-orange-700">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-orange-500" />
            <p>Все ученики имеют назначенного репетитора</p>
            <p className="text-xs mt-2 text-orange-600 font-medium">
              Откройте консоль браузера (F12 → Console) для debug информации
            </p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {studentsWithoutTutor.map((student) => (
              <div
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedStudents.includes(student.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-orange-200 bg-white hover:border-orange-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{student.full_name}</p>
                    <p className="text-sm text-slate-600">{student.email}</p>
                  </div>
                  {selectedStudents.includes(student.id) && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Миграция учеников между репетиторами</h3>
            <p className="text-sm text-blue-700">Перенос учеников от одного репетитора к другому</p>
          </div>
        </div>

        {studentsWithTutor.length === 0 ? (
          <div className="text-center py-8 text-blue-700">
            <Users className="h-12 w-12 mx-auto mb-2 text-blue-500" />
            <p>Нет учеников с назначенным репетитором</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-64 overflow-y-auto mb-4">
            {studentsWithTutor.map((student) => (
              <div
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedStudents.includes(student.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-blue-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{student.full_name}</p>
                    <p className="text-sm text-slate-600">
                      Текущий репетитор: {student.tutor?.full_name || "Не назначен"}
                    </p>
                  </div>
                  {selectedStudents.includes(student.id) && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedStudents.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-700 mb-2">Выбрано учеников: {selectedStudents.length}</p>
              <Select value={targetTutor} onValueChange={setTargetTutor}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Выберите репетитора" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {tutors.map((tutor) => (
                    <SelectItem key={tutor.id} value={tutor.id}>
                      {tutor.full_name || tutor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-6 w-6 text-purple-600" />
            <Button
              onClick={handleMigration}
              disabled={loading || !targetTutor}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? "Переношу..." : "Перенести учеников"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
