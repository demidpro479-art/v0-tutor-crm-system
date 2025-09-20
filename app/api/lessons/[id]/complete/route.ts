import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Получаем информацию об уроке
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*, students(*)")
      .eq("id", id)
      .single()

    if (lessonError) throw lessonError
    if (!lesson) {
      return NextResponse.json({ error: "Урок не найден" }, { status: 404 })
    }

    // Обновляем статус урока на "completed"
    const { error: updateError } = await supabase
      .from("lessons")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) throw updateError

    // Триггер автоматически спишет урок у ученика
    return NextResponse.json({
      success: true,
      message: "Урок отмечен как проведенный, урок списан с баланса ученика",
    })
  } catch (error) {
    console.error("Ошибка завершения урока:", error)
    return NextResponse.json({ success: false, error: "Ошибка завершения урока" }, { status: 500 })
  }
}
