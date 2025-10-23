import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users, Calendar, TrendingUp, Sparkles, Zap, Shield, BarChart } from "lucide-react"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <header className="sticky top-0 z-50 glass-effect dark:glass-effect-dark">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PySchool
              </span>
              <p className="text-xs text-muted-foreground">Premium CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="lg" className="font-semibold">
                Войти
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-950 px-4 py-2 mb-8">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Премиум CRM для репетиторов
            </span>
          </div>

          <h1 className="mb-6 text-6xl font-bold text-gray-900 dark:text-white md:text-7xl lg:text-8xl text-balance">
            Управляйте своей
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              школой легко
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-xl text-gray-600 dark:text-gray-300 text-pretty">
            Современная CRM система нового поколения. Управление учениками, расписанием, финансами и аналитикой в одном
            премиум интерфейсе.
          </p>

          <div className="flex items-center justify-center gap-4 animate-slide-up">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="gradient-primary text-white font-semibold text-lg h-14 px-8 shadow-2xl hover:shadow-indigo-500/50 transition-all"
              >
                <Zap className="mr-2 h-5 w-5" />
                Начать бесплатно
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg h-14 px-8 font-semibold border-2 hover:bg-indigo-50 dark:hover:bg-indigo-950 bg-transparent"
              >
                Войти в систему
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Все что нужно для успеха
            </h2>
            <p className="text-xl text-muted-foreground">Мощные инструменты для эффективного управления</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="group glass-effect dark:glass-effect-dark rounded-2xl p-8 hover:scale-105 transition-all duration-300 animate-scale-in">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg group-hover:shadow-indigo-500/50 transition-all">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Управление учениками</h3>
              <p className="text-muted-foreground leading-relaxed">
                Полный контроль над базой учеников с детальной аналитикой
              </p>
            </div>

            <div
              className="group glass-effect dark:glass-effect-dark rounded-2xl p-8 hover:scale-105 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg group-hover:shadow-purple-500/50 transition-all">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Умное расписание</h3>
              <p className="text-muted-foreground leading-relaxed">
                Автоматическое планирование и напоминания о занятиях
              </p>
            </div>

            <div
              className="group glass-effect dark:glass-effect-dark rounded-2xl p-8 hover:scale-105 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg group-hover:shadow-pink-500/50 transition-all">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Финансы</h3>
              <p className="text-muted-foreground leading-relaxed">Прозрачный учет доходов, выплат и прибыли</p>
            </div>

            <div
              className="group glass-effect dark:glass-effect-dark rounded-2xl p-8 hover:scale-105 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <BarChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Аналитика</h3>
              <p className="text-muted-foreground leading-relaxed">Детальная статистика и отчеты в реальном времени</p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="glass-effect dark:glass-effect-dark rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="relative z-10">
              <Shield className="h-16 w-16 mx-auto mb-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Готовы начать?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Присоединяйтесь к сотням репетиторов которые уже используют PySchool CRM
              </p>
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="gradient-primary text-white font-semibold text-lg h-14 px-10 shadow-2xl hover:shadow-indigo-500/50 transition-all"
                >
                  Начать бесплатно
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="glass-effect dark:glass-effect-dark py-12 mt-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PySchool CRM
              </span>
            </div>
            <p className="text-muted-foreground">&copy; 2025 PySchool. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
