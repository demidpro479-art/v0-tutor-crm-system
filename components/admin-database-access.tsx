"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Database, Edit, Trash2, Save, X } from "lucide-react"
import { toast } from "sonner"

export function AdminDatabaseAccess() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [editingProfile, setEditingProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    const supabase = createClient()
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

    if (error) {
      toast.error("Ошибка загрузки данных")
      console.error(error)
    } else {
      setProfiles(data || [])
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!editingProfile) return

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editingProfile.full_name,
        email: editingProfile.email,
        phone_number: editingProfile.phone_number,
        total_paid_lessons: editingProfile.total_paid_lessons,
        completed_lessons: editingProfile.completed_lessons,
        tutor_id: editingProfile.tutor_id || null,
        role: editingProfile.role,
      })
      .eq("id", editingProfile.id)

    if (error) {
      toast.error("Ошибка сохранения")
      console.error(error)
    } else {
      toast.success("Данные успешно обновлены")
      setEditingProfile(null)
      loadProfiles()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены что хотите удалить этого пользователя?")) return

    const supabase = createClient()
    const { error } = await supabase.from("profiles").delete().eq("id", id)

    if (error) {
      toast.error("Ошибка удаления")
      console.error(error)
    } else {
      toast.success("Пользователь удален")
      loadProfiles()
    }
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Загрузка базы данных...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Прямой доступ к базе данных</h2>
            <p className="text-sm text-slate-600">Полный контроль над всеми пользователями системы</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Оплачено уроков</TableHead>
                <TableHead>Проведено уроков</TableHead>
                <TableHead>Осталось уроков</TableHead>
                <TableHead>Репетитор ID</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name}</TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.phone_number || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        profile.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : profile.role === "tutor"
                            ? "bg-blue-100 text-blue-700"
                            : profile.role === "manager"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </TableCell>
                  <TableCell>{profile.total_paid_lessons || 0}</TableCell>
                  <TableCell>{profile.completed_lessons || 0}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-blue-600">
                      {(profile.total_paid_lessons || 0) - (profile.completed_lessons || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {profile.tutor_id ? profile.tutor_id.substring(0, 8) + "..." : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProfile({ ...profile })}
                        className="hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(profile.id)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
            <DialogDescription>Прямое редактирование данных в базе данных. Будьте осторожны!</DialogDescription>
          </DialogHeader>

          {editingProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Полное имя</Label>
                  <Input
                    value={editingProfile.full_name || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editingProfile.email || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={editingProfile.phone_number || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Роль</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={editingProfile.role || "student"}
                    onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value })}
                  >
                    <option value="student">Ученик</option>
                    <option value="tutor">Репетитор</option>
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Оплачено уроков</Label>
                  <Input
                    type="number"
                    value={editingProfile.total_paid_lessons || 0}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        total_paid_lessons: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Проведено уроков</Label>
                  <Input
                    type="number"
                    value={editingProfile.completed_lessons || 0}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        completed_lessons: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Осталось уроков</Label>
                  <Input
                    type="number"
                    disabled
                    value={(editingProfile.total_paid_lessons || 0) - (editingProfile.completed_lessons || 0)}
                    className="bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <Label>Репетитор ID (UUID)</Label>
                <Input
                  value={editingProfile.tutor_id || ""}
                  onChange={(e) => setEditingProfile({ ...editingProfile, tutor_id: e.target.value })}
                  placeholder="Оставьте пустым если нет репетитора"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditingProfile(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Отмена
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить изменения
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
