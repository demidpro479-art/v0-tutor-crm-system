import { createClient } from "@/lib/supabase/client"

/**
 * Рассчитывает остаток уроков для ученика
 * @param userId ID ученика
 * @returns Количество оставшихся уроков
 */
export async function calculateRemainingLessons(userId: string): Promise<number> {
  const supabase = createClient()

  try {
    // Получаем данные ученика
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("total_paid_lessons")
      .eq("id", userId)
      .single()

    if (studentError) {
      console.error("[v0] Ошибка получения данных ученика:", studentError)
      return 0
    }

    // Получаем количество проведенных уроков
    const { count: completedCount, error: lessonsError } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("status", "completed")

    if (lessonsError) {
      console.error("[v0] Ошибка получения уроков:", lessonsError)
      return 0
    }

    const remaining = (student?.total_paid_lessons || 0) - (completedCount || 0)
    return Math.max(0, remaining)
  } catch (error) {
    console.error("[v0] Ошибка расчета остатка уроков:", error)
    return 0
  }
}

/**
 * Обновляет остаток уроков для ученика в БД
 * @param userId ID ученика
 */
export async function updateRemainingLessons(userId: string): Promise<void> {
  const supabase = createClient()

  try {
    const remaining = await calculateRemainingLessons(userId)

    const { error } = await supabase.from("students").update({ remaining_lessons: remaining }).eq("id", userId)

    if (error) {
      console.error("[v0] Ошибка обновления остатка уроков:", error)
    }
  } catch (error) {
    console.error("[v0] Ошибка обновления остатка уроков:", error)
  }
}
