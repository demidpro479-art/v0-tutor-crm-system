import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { lessonIds, action } = await request.json()
    const supabase = await createClient()

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return NextResponse.json({ error: "Не указаны уроки для обработки" }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }

    switch (action) {
      case "complete":
        updateData.status = "completed"
        break
      case "cancel":
        updateData.status = "cancelled"
        break
      case "mark_missed":
        updateData.status = "missed"
        break
      default:
        return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 })
    }

    // Обновляем статус уроков
    const { error: updateError } = await supabase.from("lessons").update(updateData).in("id", lessonIds)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: `Обработано ${lessonIds.length} уроков`,
      processedCount: lessonIds.length,
    })
  } catch (error) {
    console.error("Ошибка массовой обработки уроков:", error)
    return NextResponse.json({ success: false, error: "Ошибка обработки уроков" }, { status: 500 })
  }
}
