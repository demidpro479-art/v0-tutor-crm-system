"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

interface PaymentsHistoryProps {
  managerId?: string
}

export function PaymentsHistory({ managerId }: PaymentsHistoryProps) {
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    loadPayments()
  }, [managerId])

  async function loadPayments() {
    const supabase = createBrowserClient()
    let query = supabase
      .from("payments")
      .select("*, students(name), profiles(full_name)")
      .order("created_at", { ascending: false })

    if (managerId) {
      query = query.eq("manager_id", managerId)
    }

    const { data } = await query

    setPayments(data || [])
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">История платежей</h3>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
              <p className="font-medium">{payment.students?.name}</p>
              <p className="text-sm text-gray-600">
                {new Date(payment.created_at).toLocaleDateString("ru-RU")} • {payment.lessons_purchased} уроков
              </p>
              {payment.profiles && <p className="text-xs text-gray-500">Менеджер: {payment.profiles.full_name}</p>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-semibold">{payment.amount} ₽</p>
                <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                  {payment.status === "completed" ? "Оплачено" : "Ожидает"}
                </Badge>
              </div>
              {payment.receipt_url && (
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
