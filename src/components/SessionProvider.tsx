'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider 
      refetchInterval={10 * 60} // Refetch every 10 minutes (more frequent for admin security)
      refetchOnWindowFocus={true} // Enable focus refetching for security
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </SessionProvider>
  )
}