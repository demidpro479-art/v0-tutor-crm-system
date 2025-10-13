"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, User } from "lucide-react"

export function AllStudentsList() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    setLoading(true)
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from("students")
      .select(`
        *,
        tutor:users!students_tutor_id_fkey(full_name)
      `)
      .order("name")

    setStudents(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">Пока нет учеников</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div
          key={student.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{student.name}</p>
              <p className="text-sm text-gray-600">Репетитор: {student.tutor?.full_name || "Не назначен"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Осталось уроков</p>
            <p className="text-2xl font-bold text-blue-600">{student.remaining_lessons}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
