import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Отмечаем пропущенные уроки
    const { data: missedLessons, error: missedError } = await supabase.rpc("mark_missed_lessons")
    if (missedError) throw missedError

    // Генерируем новые регулярные уроки
    const { data: newLessons, error: generateError } = await supabase.rpc("generate_recurring_lessons", {
      p_weeks_ahead: 4,
    })
    if (generateError) throw generateError

    return NextResponse.json({
      success: true,
      missedLessons,
      newLessons,
      message: `Обработано ${missedLessons} пропущенных уроков, создано ${newLessons} новых уроков`,
    })
  } catch (error) {
    console.error("Ошибка обработки уроков:", error)
    return NextResponse.json({ success: false, error: "Ошибка обработки уроков" }, { status: 500 })
  }
}
