import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

// Admin access configuration
const ADMIN_EMAILS = ['senaprasena@gmail.com']
const ADMIN_GITHUB_USERNAMES = ['senaprasena']

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Enhanced logging for debugging
      console.log(`🔐 Authentication attempt:`, {
        provider: account?.provider,
        email: user?.email,
        name: user?.name,
        githubLogin: profile?.login,
        profileData: profile,
        timestamp: new Date().toISOString()
      })

      // Additional debugging for GitHub OAuth issues
      if (account?.provider === 'github') {
        console.log(`🔍 GitHub OAuth Debug:`, {
          userObject: user,
          accountObject: account,
          profileObject: profile,
          loginFromProfile: profile?.login,
          nameFromUser: user?.name,
          nameFromProfile: profile?.name,
          adminUsernames: ADMIN_GITHUB_USERNAMES,
          loginType: typeof profile?.login,
          exactMatch: ADMIN_GITHUB_USERNAMES.includes(profile?.login),
          caseInsensitiveMatch: ADMIN_GITHUB_USERNAMES.some(username => username.toLowerCase() === profile?.login?.toLowerCase())
        })
      }

      // Additional debugging for Google OAuth issues
      if (account?.provider === 'google') {
        console.log(`🔍 Google OAuth Debug:`, {
          userObject: user,
          accountObject: account,
          profileObject: profile,
          emailFromUser: user?.email,
          emailFromProfile: profile?.email,
          adminEmails: ADMIN_EMAILS,
          emailType: typeof user?.email,
          emailTrimmed: user?.email?.trim(),
          exactMatch: ADMIN_EMAILS.includes(user?.email),
          caseInsensitiveMatch: ADMIN_EMAILS.some(email => email.toLowerCase() === user?.email?.toLowerCase())
        })
      }

      // Check if user is authorized admin
      let isAuthorized = false
      
      if (account?.provider === 'google' && user?.email) {
        // Try both exact match and case-insensitive match
        const userEmail = user.email.trim().toLowerCase()
        const adminEmailsLower = ADMIN_EMAILS.map(email => email.toLowerCase())
        
        isAuthorized = adminEmailsLower.includes(userEmail)
        console.log(`🔍 Google auth check: ${user.email} -> ${isAuthorized ? 'ALLOWED' : 'DENIED'}`)
        console.log(`🔍 Email comparison: "${userEmail}" in [${adminEmailsLower.join(', ')}]`)
      } else if (account?.provider === 'github' && profile?.login) {
        // Try both exact match and case-insensitive match for GitHub
        const githubLogin = profile.login.trim().toLowerCase()
        const adminUsernamesLower = ADMIN_GITHUB_USERNAMES.map(username => username.toLowerCase())
        
        isAuthorized = adminUsernamesLower.includes(githubLogin)
        console.log(`🔍 GitHub auth check: ${profile.login} -> ${isAuthorized ? 'ALLOWED' : 'DENIED'}`)
        console.log(`🔍 Username comparison: "${githubLogin}" in [${adminUsernamesLower.join(', ')}]`)
      } else {
        console.log(`❌ Missing required data for authorization:`, {
          provider: account?.provider,
          hasEmail: !!user?.email,
          hasGithubLogin: !!profile?.login
        })
      }

      if (isAuthorized) {
        console.log(`✅ Admin access granted to: ${user?.email || profile?.login}`)
      } else {
        console.log(`❌ Admin access denied to: ${user?.email || profile?.login}`)
      }

      return isAuthorized
    },
    async signOut({ token, session }) {
      // Clear any cached data and force session cleanup
      console.log(`🚪 Sign out initiated for:`, {
        email: token?.email || session?.user?.email,
        provider: token?.provider,
        timestamp: new Date().toISOString()
      })
      
      // Return true to allow sign out
      return true
    },
    async session({ session, token }) {
      // Add admin flag to session
      session.isAdmin = true // Only admins can reach this point
      session.provider = token?.provider
      
      // Force session refresh on provider change
      if (token?.provider) {
        session.provider = token.provider
      }
      
      return session
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Handle session updates and account switching
      if (trigger === 'signIn' || trigger === 'signUp') {
        console.log(`🔄 JWT callback - ${trigger}:`, {
          provider: account?.provider,
          email: user?.email,
          timestamp: new Date().toISOString()
        })
      }
      
      if (user) {
        token.isAdmin = true
        // Store provider info for logging
        token.provider = account?.provider
        if (account?.provider === 'github' && profile?.login) {
          token.githubUsername = profile.login
        }
        
        // Clear any previous provider data when switching
        if (account?.provider === 'google') {
          delete token.githubUsername
        }
      }
      
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})