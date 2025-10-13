import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
})

const geistMono = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "CRM Репетитора - Управление учениками и расписанием",
  description: "Современная CRM-система для репетиторов с календарем, статистикой и управлением учениками",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className={`font-sans ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <Suspense fallback={null}>
          {children}
          <Toaster />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
