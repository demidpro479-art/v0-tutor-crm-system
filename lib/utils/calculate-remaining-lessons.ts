import { createClient } from "@/lib/supabase/client"

/**
 * Рассчитывает остаток уроков для ученика
 * Формула: оплачено_уроков - проведено_уроков
 * @param userId ID ученика (user_id из profiles)
 * @returns Количество оставшихся уроков
 */
export async function calculateRemainingLessons(userId: string): Promise<number> {
  const supabase = createClient()

  try {
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, lessons_purchased")
      .eq("student_id", userId)

    if (paymentsError) {
      console.error("[v0] Ошибка получения оплат:", paymentsError)
      return 0
    }

    const totalPurchasedLessons = paymentsData?.reduce((sum, p) => sum + (p.lessons_purchased || 0), 0) || 0

    const { count: completedCount, error: lessonsError } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("status", "completed")

    if (lessonsError) {
      console.error("[v0] Ошибка получения уроков:", lessonsError)
      return 0
    }

    const remaining = totalPurchasedLessons - (completedCount || 0)

    console.log("[v0] Расчет остатка уроков:", {
      userId,
      totalPurchasedLessons,
      completedCount,
      remaining,
    })

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

    const { error } = await supabase.from("students").update({ remaining_lessons: remaining }).eq("user_id", userId)

    if (error) {
      console.error("[v0] Ошибка обновления остатка уроков:", error)
    }
  } catch (error) {
    console.error("[v0] Ошибка обновления остатка уроков:", error)
  }
}

/**
 * Рассчитывает доход репетитора за период
 * Формула: количество_проведенных_уроков × ставка_за_урок
 * @param tutorId ID репетитора
 * @param startDate Начало периода
 * @param endDate Конец периода
 * @returns Доход репетитора
 */
export async function calculateTutorEarnings(tutorId: string, startDate?: Date, endDate?: Date): Promise<number> {
  const supabase = createClient()

  try {
    const { data: students } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("role", "student")
      .eq("tutor_id", tutorId)
      .not("tutor_id", "is", null)

    const studentUserIds = students?.map((s) => s.user_id) || []

    if (studentUserIds.length === 0) {
      return 0
    }

    let lessonsQuery = supabase
      .from("lessons")
      .select("price")
      .eq("status", "completed")
      .in("student_id", studentUserIds)

    if (startDate) {
      lessonsQuery = lessonsQuery.gte("scheduled_at", startDate.toISOString())
    }

    if (endDate) {
      lessonsQuery = lessonsQuery.lte("scheduled_at", endDate.toISOString())
    }

    const { data: lessons, error } = await lessonsQuery

    if (error) {
      console.error("[v0] Ошибка получения уроков репетитора:", error)
      return 0
    }

    const totalEarnings = lessons?.reduce((sum, lesson) => sum + (Number(lesson.price) || 0), 0) || 0

    console.log("[v0] Расчет дохода репетитора:", {
      tutorId,
      studentCount: studentUserIds.length,
      lessonsCount: lessons?.length,
      totalEarnings,
    })

    return totalEarnings
  } catch (error) {
    console.error("[v0] Ошибка расчета дохода репетитора:", error)
    return 0
  }
}
