import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Admin access configuration - SIMPLIFIED (Google only)
const ADMIN_EMAILS = ['senaprasena@gmail.com']

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account", // Force account selection for security
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours (shorter for admin security)
    updateAge: 30 * 60, // 30 minutes
  },
  jwt: {
    maxAge: 2 * 60 * 60, // 2 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Enhanced logging for debugging
      console.log(`🔐 Admin authentication attempt:`, {
        provider: account?.provider,
        email: user?.email,
        name: user?.name,
        timestamp: new Date().toISOString()
      })

      // Google OAuth authorization check
      let isAuthorized = false
      if (account?.provider === 'google' && user?.email) {
        isAuthorized = ADMIN_EMAILS.includes(user.email.toLowerCase().trim())
        console.log('🔍 Google admin check:', { 
          email: user.email, 
          isAuthorized,
          adminEmails: ADMIN_EMAILS 
        })
      }

      if (isAuthorized) {
        console.log(`✅ Admin access granted to: ${user.email}`)
      } else {
        console.log(`❌ Admin access denied to: ${user.email}`)
      }

      return isAuthorized
    },
    async signOut({ token, session }) {
      // Enhanced logout logging and cleanup
      console.log(`🚪 Admin logout initiated:`, {
        email: token?.email || session?.user?.email,
        timestamp: new Date().toISOString(),
        sessionDuration: token?.iat ? Date.now() - (token.iat * 1000) : 'unknown'
      })
      
      // Force complete session cleanup
      return true
    },
    async session({ session, token }) {
      // Add admin flag to session
      session.isAdmin = true // Only admins can reach this point
      session.provider = 'google'
      
      // Add session metadata for security
      session.loginTime = token?.iat
      session.lastActivity = Date.now()
      
      return session
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Handle session updates
      if (trigger === 'signIn' || trigger === 'signUp') {
        console.log(`🔄 JWT callback - Admin ${trigger}:`, {
          email: user?.email,
          timestamp: new Date().toISOString()
        })
      }
      
      if (user) {
        token.isAdmin = true
        token.provider = 'google'
        token.loginTime = Date.now()
      }
      
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  // Enhanced security settings
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 // 2 hours
      }
    }
  }
})