import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'TT - AI 智能待办助手',
  description: '用 AI 帮你轻松管理每日待办，智能提取任务，流程追踪一目了然',
  applicationName: 'TT',
  generator: 'v0.app',
  manifest: './manifest.webmanifest',
  icons: {
    icon: './icon.svg',
    apple: './apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TT',
  },
}

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
