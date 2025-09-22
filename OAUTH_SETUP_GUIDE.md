# OAuth Setup Guide - Google & GitHub Authentication

## Overview
This guide covers implementing Google and GitHub OAuth authentication using NextAuth.js in a Next.js application.

## Prerequisites
- Next.js application
- NextAuth.js installed (`npm install next-auth`)
- Google Cloud Console account
- GitHub account

## Step 1: OAuth Provider Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - Application name: Your app name
   - Authorized domains: Your domain (e.g., localhost for development)
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret

### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID and generate Client Secret

## Step 2: Environment Variables
Create `.env.local` file in your project root:

```env
NEXTAUTH_SECRET=your_random_secret_string_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

## Step 3: NextAuth Configuration
Create `pages/api/auth/[...nextauth].js`:

```javascript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

// Admin authorization lists
const ADMIN_EMAILS = ['your-admin@gmail.com']
const ADMIN_GITHUB_USERNAMES = ['your-github-username']

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 Authentication attempt:', {
        provider: account?.provider,
        userEmail: user?.email,
        githubLogin: profile?.login,
        profileData: profile
      })

      let isAuthorized = false

      if (account?.provider === 'google' && user?.email) {
        isAuthorized = ADMIN_EMAILS.includes(user.email)
        console.log('🔍 Google auth check:', { email: user.email, isAuthorized })
      } else if (account?.provider === 'github' && profile?.login) {
        isAuthorized = ADMIN_GITHUB_USERNAMES.includes(profile.login)
        console.log('🔍 GitHub auth check:', { username: profile.login, isAuthorized })
      } else {
        console.log('❌ Missing authorization data')
      }

      if (isAuthorized) {
        console.log('✅ User authorized successfully')
      } else {
        console.log('❌ User not authorized')
      }

      return isAuthorized
    },
    async session({ session, token }) {
      // Add admin flag and provider info to session
      session.isAdmin = true // User is admin if they reach this point
      session.provider = token.provider
      return session
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider
        if (account.provider === 'github') {
          token.githubUsername = profile?.login
        }
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin', // Optional: custom sign-in page
    error: '/auth/error',   // Optional: custom error page
  }
})
```

## Step 4: Session Provider Setup
Create `src/components/SessionProvider.tsx`:

```tsx
'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

Update your root layout (`src/app/layout.tsx`):

```tsx
import SessionProvider from '@/components/SessionProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

## Step 5: Protected Routes Implementation
Example admin page (`src/app/admin/page.tsx`):

```tsx
'use client'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function AdminPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="mb-4">Please sign in with an authorized account:</p>
          <div className="space-x-4">
            <button
              onClick={() => signIn('google')}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => signIn('github')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Sign in with GitHub
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You don't have admin privileges.</p>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span>Welcome, {session.user?.name || session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {/* Your admin content here */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>
          <p>This is your protected admin area.</p>
        </div>
      </div>
    </div>
  )
}
```

## Step 6: Testing
1. Start your development server: `npm run dev`
2. Navigate to your admin route
3. Test both Google and GitHub sign-in
4. Verify unauthorized users are blocked
5. Check console logs for authentication debugging

## Key Differences Between Providers

| Provider | Authorization Field | Example Value |
|----------|-------------------|---------------|
| Google   | `user.email`      | `admin@gmail.com` |
| GitHub   | `profile.login`   | `username` |

## Security Best Practices
1. Never commit OAuth secrets to version control
2. Use different OAuth apps for development/production
3. Regularly rotate OAuth secrets
4. Monitor authentication logs
5. Implement proper error handling
6. Use HTTPS in production

## Troubleshooting
- **"OAuth app not found"**: Check client ID/secret in environment variables
- **"Redirect URI mismatch"**: Verify callback URLs in OAuth app settings
- **"Access denied"**: Check if user email/username is in admin lists
- **"Invalid client"**: Ensure OAuth app is properly configured

## Production Deployment
1. Update OAuth app redirect URIs to production domain
2. Set `NEXTAUTH_URL` to production URL
3. Use secure, random `NEXTAUTH_SECRET`
4. Enable HTTPS
5. Update admin authorization lists as needed

---

*Guide created: January 2025*
*Compatible with: Next.js 14+, NextAuth.js 4+*