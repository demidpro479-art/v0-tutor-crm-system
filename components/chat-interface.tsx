"use client"

import { useState, useEffect, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MessageSquare, Plus, Send, Bot, ArrowLeft, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender_id: string | null
  is_ai: boolean
  created_at: string
}

interface Chat {
  id: string
  created_at: string
  updated_at: string
}

interface ChatParticipant {
  chat_id: string
  user_id: string
  profile?: {
    full_name: string
    email: string
  }
}

export function ChatInterface({
  userId,
  userEmail,
  userName,
  userRole,
}: {
  userId: string
  userEmail: string
  userName?: string
  userRole?: string
}) {
  const [chats, setChats] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [newChatEmail, setNewChatEmail] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    loadChats()

    // Subscribe to new messages
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.new.chat_id === selectedChat) {
            loadMessages(selectedChat)
          }
          loadChats()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (selectedChat && window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }, [selectedChat])

  const loadChats = async () => {
    const { data: participantData } = await supabase.from("chat_participants").select("chat_id").eq("user_id", userId)

    if (participantData) {
      const chatIds = participantData.map((p) => p.chat_id)

      const { data: chatsData } = await supabase
        .from("chats")
        .select("*")
        .in("id", chatIds)
        .order("updated_at", { ascending: false })

      if (chatsData) {
        const chatsWithParticipants = await Promise.all(
          chatsData.map(async (chat) => {
            const { data: participants } = await supabase
              .from("chat_participants")
              .select(`
                user_id,
                profiles:user_id (
                  full_name,
                  email
                )
              `)
              .eq("chat_id", chat.id)

            const { data: lastMsg } = await supabase
              .from("messages")
              .select("*")
              .eq("chat_id", chat.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            // Check if it's an AI chat (only one participant)
            const isAIChat = participants?.length === 1

            return {
              ...chat,
              participants: participants || [],
              last_message: lastMsg,
              is_ai_chat: isAIChat,
            }
          }),
        )

        setChats(chatsWithParticipants)
      }
    }
  }

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const createNewChat = async () => {
    if (!newChatEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите email пользователя",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    const { data: targetUser } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("email", newChatEmail.trim())
      .single()

    if (!targetUser) {
      toast({
        title: "Ошибка",
        description: "Пользователь с таким email не найден",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (targetUser.user_id === userId) {
      toast({
        title: "Ошибка",
        description: "Нельзя создать чат с самим собой",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Check if chat already exists
    const { data: myChats } = await supabase.from("chat_participants").select("chat_id").eq("user_id", userId)

    if (myChats) {
      for (const chat of myChats) {
        const { data: otherParticipant } = await supabase
          .from("chat_participants")
          .select("user_id")
          .eq("chat_id", chat.chat_id)
          .eq("user_id", targetUser.user_id)
          .single()

        if (otherParticipant) {
          setSelectedChat(chat.chat_id)
          setIsDialogOpen(false)
          setNewChatEmail("")
          setLoading(false)
          loadMessages(chat.chat_id)
          toast({
            title: "Чат уже существует",
            description: "Открыт существующий чат с этим пользователем",
          })
          return
        }
      }
    }

    // Create new chat
    const { data: newChat, error: chatError } = await supabase.from("chats").insert({}).select().single()

    if (chatError || !newChat) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать чат",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Add participants
    await supabase.from("chat_participants").insert([
      { chat_id: newChat.id, user_id: userId },
      { chat_id: newChat.id, user_id: targetUser.user_id },
    ])

    setIsDialogOpen(false)
    setNewChatEmail("")
    setLoading(false)
    loadChats()
    setSelectedChat(newChat.id)
    loadMessages(newChat.id)

    toast({
      title: "Чат создан",
      description: `Создан чат с ${targetUser.full_name || targetUser.email}`,
    })
  }

  const createAIChat = async () => {
    setLoading(true)

    const { data: newChat, error } = await supabase.from("chats").insert({}).select().single()

    if (error || !newChat) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать AI чат",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    await supabase.from("chat_participants").insert({
      chat_id: newChat.id,
      user_id: userId,
    })

    setLoading(false)
    loadChats()
    setSelectedChat(newChat.id)
    setIsDialogOpen(false)
    loadMessages(newChat.id)

    toast({
      title: "AI Чат создан",
      description: "Создан новый чат с AI ассистентом",
    })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    const { error } = await supabase.from("messages").insert({
      chat_id: selectedChat,
      sender_id: userId,
      content: newMessage.trim(),
      is_ai: false,
    })

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      })
      return
    }

    const messageContent = newMessage.trim()
    setNewMessage("")
    loadMessages(selectedChat)

    // Check if this is an AI chat and trigger AI response
    const chat = chats.find((c) => c.id === selectedChat)
    if (chat?.is_ai_chat) {
      setAiLoading(true)
      // Trigger AI response
      fetch("/api/chat/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: selectedChat,
          message: messageContent,
          userId,
          userRole,
        }),
      }).finally(() => {
        setAiLoading(false)
      })
    }
  }

  const selectedChatData = chats.find((c) => c.id === selectedChat)
  const otherParticipant = selectedChatData?.participants.find((p: any) => p.user_id !== userId)

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full md:w-80 border-r border-border/50 glass-card flex flex-col",
          !showSidebar && "hidden md:flex",
        )}
      >
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Чаты
            </h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-purple-500/20">
                <DialogHeader>
                  <DialogTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Новый чат
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-foreground">
                      Email пользователя
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newChatEmail}
                      onChange={(e) => setNewChatEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createNewChat()}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={createNewChat}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Создать чат
                    </Button>
                    <Button
                      onClick={createAIChat}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Чат
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chats.map((chat) => {
            const other = chat.participants.find((p: any) => p.user_id !== userId)
            const isAI = chat.is_ai_chat

            return (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat.id)
                  loadMessages(chat.id)
                }}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-purple-500/10 transition-all duration-200 border-b border-border/30",
                  selectedChat === chat.id && "bg-purple-500/20 border-l-4 border-l-purple-500",
                )}
              >
                <Avatar className="shrink-0">
                  <AvatarFallback
                    className={
                      isAI
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                        : "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                    }
                  >
                    {isAI ? <Bot className="h-4 w-4" /> : other?.profiles?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate text-foreground">
                    {isAI ? "AI Ассистент" : other?.profiles?.full_name || other?.profiles?.email}
                  </div>
                  {chat.last_message && (
                    <div className="text-sm text-muted-foreground truncate">{chat.last_message.content}</div>
                  )}
                </div>
              </button>
            )
          })}
          {chats.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Нет чатов</p>
              <p className="text-sm mt-2">Создайте новый чат</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col", showSidebar && "hidden md:flex")}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border/50 glass-card flex items-center gap-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden hover:bg-purple-500/20"
                onClick={() => {
                  setShowSidebar(true)
                  setSelectedChat(null)
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar>
                <AvatarFallback
                  className={
                    selectedChatData?.is_ai_chat
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                      : "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                  }
                >
                  {selectedChatData?.is_ai_chat ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    otherParticipant?.profiles?.full_name?.[0] || "?"
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-foreground">
                  {selectedChatData?.is_ai_chat
                    ? "AI Ассистент"
                    : otherParticipant?.profiles?.full_name || otherParticipant?.profiles?.email}
                </div>
                {!selectedChatData?.is_ai_chat && (
                  <div className="text-sm text-muted-foreground truncate">{otherParticipant?.profiles?.email}</div>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-slate-950/50 to-purple-950/30">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === userId
                  const isAI = msg.is_ai

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-3 animate-fade-in", isOwn && !isAI && "flex-row-reverse")}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={
                            isAI
                              ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                              : isOwn
                                ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                                : "bg-gradient-to-br from-slate-700 to-slate-600 text-white"
                          }
                        >
                          {isAI ? (
                            <Bot className="h-3 w-3" />
                          ) : isOwn ? (
                            userName?.[0] || "?"
                          ) : (
                            otherParticipant?.profiles?.full_name?.[0] || "?"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 shadow-lg",
                          isAI
                            ? "glass-card bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-purple-500/30"
                            : isOwn
                              ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                              : "glass-card bg-card/80",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <p className={cn("text-xs mt-2", isAI || isOwn ? "opacity-70" : "text-muted-foreground")}>
                          {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {aiLoading && (
                  <div className="flex gap-3 animate-fade-in">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                        <Bot className="h-3 w-3 animate-pulse" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="glass-card bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                        <p className="text-sm text-muted-foreground">AI печатает...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border/50 glass-card bg-gradient-to-r from-purple-600/10 to-pink-600/10">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="flex-1 bg-background/50 border-border/50 focus:border-purple-500/50"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || aiLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 bg-gradient-to-br from-slate-950/50 to-purple-950/30">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Выберите чат или создайте новый</p>
              <p className="text-sm mt-2 opacity-70">Начните общение с коллегами или AI ассистентом</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
