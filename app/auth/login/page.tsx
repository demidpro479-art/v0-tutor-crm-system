"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Page() {
  const [tutorEmail, setTutorEmail] = useState("")
  const [tutorPassword, setTutorPassword] = useState("")
  const [studentLogin, setStudentLogin] = useState("")
  const [studentPassword, setStudentPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: tutorEmail,
        password: tutorPassword,
      })
      if (error) throw error

      router.push("/dashboard")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка входа")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Находим ученика по логину
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, student_password, student_login")
        .eq("student_login", studentLogin)
        .single()

      if (studentError || !student) {
        throw new Error("Неверный логин или пароль")
      }

      // Проверяем пароль
      if (student.student_password !== studentPassword) {
        throw new Error("Неверный логин или пароль")
      }

      // Формируем email для входа
      const studentEmail = `${studentLogin}@student.tutorcrm.local`

      // Входим через Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: studentPassword,
      })

      if (authError) {
        throw new Error("Неверный логин или пароль. Убедитесь, что учетная запись была создана.")
      }

      router.push("/student")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка входа")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 md:p-10 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM для репетитора</h1>
            <p className="text-gray-600">Войдите в свой аккаунт</p>
          </div>

          <Tabs defaultValue="tutor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tutor">Репетитор</TabsTrigger>
              <TabsTrigger value="student">Ученик</TabsTrigger>
            </TabsList>

            <TabsContent value="tutor">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Вход для репетитора</CardTitle>
                  <CardDescription>Введите email и пароль</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTutorLogin}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="tutor-email">Email</Label>
                        <Input
                          id="tutor-email"
                          type="email"
                          placeholder="your@email.com"
                          required
                          value={tutorEmail}
                          onChange={(e) => setTutorEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tutor-password">Пароль</Label>
                        <Input
                          id="tutor-password"
                          type="password"
                          required
                          value={tutorPassword}
                          onChange={(e) => setTutorPassword(e.target.value)}
                        />
                      </div>
                      {error && <p className="text-sm text-red-500">{error}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Вход..." : "Войти"}
                      </Button>
                    </div>
                    <div className="mt-4 text-center text-sm">
                      Нет аккаунта?{" "}
                      <Link href="/auth/sign-up" className="underline underline-offset-4">
                        Зарегистрироваться
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="student">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Вход для ученика</CardTitle>
                  <CardDescription>Введите логин и пароль, полученные от репетитора</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStudentLogin}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="student-login">Логин</Label>
                        <Input
                          id="student-login"
                          type="text"
                          placeholder="Ваш логин"
                          required
                          value={studentLogin}
                          onChange={(e) => setStudentLogin(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="student-password">Пароль</Label>
                        <Input
                          id="student-password"
                          type="password"
                          required
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                        />
                      </div>
                      {error && <p className="text-sm text-red-500">{error}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Вход..." : "Войти"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
