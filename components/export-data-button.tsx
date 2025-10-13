"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ExportDataButtonProps {
  data: any[]
  filename: string
  type: "students" | "lessons" | "earnings"
}

export function ExportDataButton({ data, filename, type }: ExportDataButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const exportToCSV = () => {
    setLoading(true)
    try {
      let headers: string[] = []
      let rows: string[][] = []

      if (type === "students") {
        headers = ["Имя", "Email", "Телефон", "Оставшиеся уроки", "Всего оплачено", "Статус"]
        rows = data.map((item) => [
          item.name,
          item.email || "",
          item.phone || "",
          item.remaining_lessons?.toString() || "0",
          item.total_paid_lessons?.toString() || "0",
          item.is_active ? "Активен" : "Неактивен",
        ])
      } else if (type === "lessons") {
        headers = ["Ученик", "Название", "Дата", "Время", "Статус", "Стоимость"]
        rows = data.map((item) => [
          item.student_name,
          item.title,
          new Date(item.scheduled_at).toLocaleDateString("ru-RU"),
          new Date(item.scheduled_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          item.status,
          item.price?.toString() || "0",
        ])
      } else if (type === "earnings") {
        headers = ["Дата", "Описание", "Сумма", "Статус"]
        rows = data.map((item) => [
          new Date(item.created_at).toLocaleDateString("ru-RU"),
          item.description || "",
          item.amount?.toString() || "0",
          item.status,
        ])
      }

      const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Успешно",
        description: "Данные экспортированы в CSV",
      })
    } catch (error) {
      console.error("Ошибка экспорта:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToJSON = () => {
    setLoading(true)
    try {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: "application/json" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.json`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Успешно",
        description: "Данные экспортированы в JSON",
      })
    } catch (error) {
      console.error("Ошибка экспорта:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Экспорт в CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт в JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
