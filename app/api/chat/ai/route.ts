import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { chatId, message, userId, userRole } = await request.json()

    if (!chatId || !message || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data: history } = await supabase
      .from("messages")
      .select("content, is_ai")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(10)

    let systemPrompt = ""
    switch (userRole) {
      case "admin":
        systemPrompt =
          "Ты AI-ассистент для администратора CRM-системы репетиторов. Помогай с управлением пользователями, студентами, финансами и аналитикой. Отвечай профессионально и предоставляй детальную информацию на русском языке."
        break
      case "tutor":
        systemPrompt =
          "Ты AI-ассистент для репетитора. Помогай с планированием уроков, управлением студентами, отслеживанием прогресса и подготовкой материалов. Будь дружелюбным и поддерживающим. Отвечай на русском языке."
        break
      case "manager":
        systemPrompt =
          "Ты AI-ассистент для менеджера. Помогай с продажами, работой с клиентами, отчетностью и координацией. Отвечай эффективно и по делу на русском языке."
        break
      default:
        systemPrompt =
          "Ты AI-ассистент для CRM-системы репетиторов. Помогай пользователям с их задачами, отвечай вежливо и информативно на русском языке."
    }

    // Prepare messages for AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: message },
    ]

    // Call Grok API
    const apiKey = process.env.AI_XAI_API_KEY || process.env.XAI_API_KEY

    if (!apiKey) {
      // Fallback response if API key is not set
      const fallbackResponse =
        "AI-ассистент временно недоступен. Пожалуйста, добавьте AI_XAI_API_KEY в переменные окружения проекта."

      await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: null,
        content: fallbackResponse,
        is_ai: true,
      })

      return NextResponse.json({ success: true })
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get AI response")
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || "Извините, не могу ответить на этот вопрос."

    // Save AI response to database
    await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: null,
      content: aiResponse,
      is_ai: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("AI chat error:", error)

    // Try to save error message to chat
    try {
      const { chatId } = await request.json()
      const supabase = await createServerClient()

      await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: null,
        content: "Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.",
        is_ai: true,
      })
    } catch (e) {
      // Ignore error saving error message
    }

    return NextResponse.json({ error: "Failed to process AI chat" }, { status: 500 })
  }
}
