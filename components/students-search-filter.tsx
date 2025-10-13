"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface StudentsSearchFilterProps {
  onSearchChange: (search: string) => void
  onFilterChange: (filter: string) => void
  onSortChange: (sort: string) => void
}

export function StudentsSearchFilter({ onSearchChange, onFilterChange, onSortChange }: StudentsSearchFilterProps) {
  const [search, setSearch] = useState("")

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени, email или телефону..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            onSearchChange(e.target.value)
          }}
          className="pl-10"
        />
      </div>

      <Select onValueChange={onFilterChange} defaultValue="all">
        <SelectTrigger className="w-full sm:w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Фильтр" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все ученики</SelectItem>
          <SelectItem value="active">Активные</SelectItem>
          <SelectItem value="inactive">Неактивные</SelectItem>
          <SelectItem value="has_lessons">Есть уроки</SelectItem>
          <SelectItem value="no_lessons">Нет уроков</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={onSortChange} defaultValue="name_asc">
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name_asc">Имя (А-Я)</SelectItem>
          <SelectItem value="name_desc">Имя (Я-А)</SelectItem>
          <SelectItem value="lessons_desc">Больше уроков</SelectItem>
          <SelectItem value="lessons_asc">Меньше уроков</SelectItem>
          <SelectItem value="recent">Недавно добавленные</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
