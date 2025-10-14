import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users, Calendar, TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">CRM для репетитора</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Регистрация</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl">
            Управляйте своими учениками
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              легко и эффективно
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            Современная CRM система для репетиторов. Управление учениками, расписанием, уроками и заработком в одном
            месте.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg">
                Начать бесплатно
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg bg-transparent">
                Войти в систему
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <Users className="mb-4 h-12 w-12 text-blue-600" />
              <h3 className="mb-2 text-xl font-semibold">Управление учениками</h3>
              <p className="text-gray-600">Храните всю информацию об учениках в одном месте</p>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <Calendar className="mb-4 h-12 w-12 text-cyan-600" />
              <h3 className="mb-2 text-xl font-semibold">Расписание уроков</h3>
              <p className="text-gray-600">Планируйте и отслеживайте все уроки</p>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <TrendingUp className="mb-4 h-12 w-12 text-green-600" />
              <h3 className="mb-2 text-xl font-semibold">Учет заработка</h3>
              <p className="text-gray-600">Отслеживайте доходы и выплаты</p>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <GraduationCap className="mb-4 h-12 w-12 text-purple-600" />
              <h3 className="mb-2 text-xl font-semibold">Статистика</h3>
              <p className="text-gray-600">Анализируйте свою работу</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 CRM для репетитора. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}
