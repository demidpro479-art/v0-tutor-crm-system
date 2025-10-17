"use server"

import { createClient } from "@supabase/supabase-js"

interface CreateUserParams {
  email: string
  full_name: string
  role: "admin" | "tutor" | "manager"
  rate_per_lesson?: number
  lesson_price?: number
}

export async function createUser(params: CreateUserParams) {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Генерируем случайный пароль (12 символов)
    const password = Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase()

    console.log("[v0] Создание пользователя:", { email: params.email, password })

    // Создаем пользователя в Supabase Auth через Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: password,
      email_confirm: true,
    })

    if (authError) {
      console.error("[v0] Ошибка создания auth пользователя:", authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: "Не удалось создать пользователя" }
    }

    console.log("[v0] Auth пользователь создан:", authData.user.id)

    // Создаем запись в таблице users
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        auth_user_id: authData.user.id,
        email: params.email,
        full_name: params.full_name,
        role: params.role,
      })
      .select()
      .single()

    if (userError) {
      console.error("[v0] Ошибка создания записи в users:", userError)
      // Удаляем auth пользователя если не удалось создать запись в users
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: userError.message }
    }

    console.log("[v0] Запись в users создана:", userData.id)

    // Добавляем роль в user_roles
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: params.role,
    })

    if (roleError) {
      console.error("[v0] Ошибка добавления роли:", roleError)
    }

    // Устанавливаем активную роль
    const { error: activeRoleError } = await supabaseAdmin.from("user_active_role").insert({
      user_id: authData.user.id,
      active_role: params.role,
    })

    if (activeRoleError) {
      console.error("[v0] Ошибка установки активной роли:", activeRoleError)
    }

    // Если это репетитор, создаем настройки
    if (params.role === "tutor") {
      const { error: settingsError } = await supabaseAdmin.from("tutor_settings").insert({
        user_id: authData.user.id,
        rate_per_lesson: params.rate_per_lesson || 0,
        lesson_price: params.lesson_price || 0,
      })

      if (settingsError) {
        console.error("[v0] Ошибка создания настроек репетитора:", settingsError)
      }
    }

    console.log("[v0] Пользователь успешно создан")

    return {
      success: true,
      password: password,
      user: userData,
    }
  } catch (error: any) {
    console.error("[v0] Неожиданная ошибка:", error)
    return { success: false, error: error.message }
  }
}
