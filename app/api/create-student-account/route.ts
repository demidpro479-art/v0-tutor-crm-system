import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { studentId, login, password, studentName } = await request.json()

    console.log("[v0] Создание аккаунта для ученика:", { studentId, login, studentName })

    const supabase = createAdminClient()
    const studentEmail = `${login}@student.tutorcrm.local`

    // Создаем Supabase аккаунт
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: "student",
        student_id: studentId,
        student_name: studentName,
      },
    })

    if (authError) {
      console.error("[v0] Ошибка создания Supabase аккаунта:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Аккаунт успешно создан:", authData.user.id)

    return NextResponse.json({ success: true, authData })
  } catch (error) {
    console.error("[v0] Ошибка в API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
