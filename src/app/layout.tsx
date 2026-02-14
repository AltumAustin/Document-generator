import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "DocGen - Document Generation Platform",
  description:
    "Production-ready document automation platform. Create interactive questionnaires that dynamically generate completed legal and business documents.",
  keywords: ["document generation", "legal documents", "questionnaire", "automation", "NDA", "SAFE"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
