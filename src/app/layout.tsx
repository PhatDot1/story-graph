import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Sidebar } from "@/components/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Story Graph - IP Asset Management",
  description: "Visualize and manage intellectual property assets with network analysis",
  keywords: ["IP", "intellectual property", "network analysis", "asset management", "Story Protocol"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <div className="flex min-h-screen gradient-bg">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
