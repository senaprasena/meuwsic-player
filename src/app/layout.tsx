import type { Metadata } from 'next'
import './globals.css'
import AuthSessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'Meuwsic Player',
  description: 'A modern music player built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}  