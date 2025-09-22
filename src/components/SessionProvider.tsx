'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch session every 5 minutes (300 seconds)
      refetchOnWindowFocus={false} // Disable aggressive window focus refetching
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </SessionProvider>
  )
}