# MEUWSIC Development Log

## OAuth Authentication Implementation - January 2025

### Problem Solved: GitHub OAuth Authorization Issue

**Issue**: GitHub OAuth authentication was failing due to confusion about which identifier to use for authorization checks.

**Root Cause**: 
- GitHub OAuth provides the username via `profile.login` field, not email
- Initial confusion between Google OAuth (uses email) and GitHub OAuth (uses username)

**Solution**:
```javascript
// Correct configuration for admin authorization
const ADMIN_EMAILS = ['senaprasena@gmail.com']        // For Google OAuth
const ADMIN_GITHUB_USERNAMES = ['senaprasena']        // For GitHub OAuth

// Authorization logic in signIn callback
if (account?.provider === 'google' && user?.email) {
  isAuthorized = ADMIN_EMAILS.includes(user.email)
} else if (account?.provider === 'github' && profile?.login) {
  isAuthorized = ADMIN_GITHUB_USERNAMES.includes(profile.login)
}
```

**Key Learning**: 
- Google OAuth: Use `user.email` for authorization
- GitHub OAuth: Use `profile.login` for authorization (username, not email)

### OAuth Implementation Details

#### Providers Configured:
1. **Google OAuth**
   - Uses email-based authorization
   - Admin email: `senaprasena@gmail.com`
   - Field used: `user.email`

2. **GitHub OAuth** 
   - Uses username-based authorization
   - Admin username: `senaprasena`
   - Field used: `profile.login`

#### Security Features Implemented:
- Admin-only access to `/admin` route
- Comprehensive authentication logging
- Session includes admin flags and provider info
- Unauthorized access handling with clear messaging
- Server-side and client-side authorization checks

#### Files Modified:
- `pages/api/auth/[...nextauth].js` - NextAuth configuration
- `src/app/admin/page.tsx` - Admin page with access control
- `.env.local` - Environment variables for OAuth credentials

### Environment Variables Required:
```
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

### Testing Results:
- ✅ Google OAuth with authorized email works
- ✅ GitHub OAuth with authorized username works
- ✅ Unauthorized users see proper access denied message
- ✅ Authentication attempts are logged for security monitoring
- ✅ Admin dashboard only accessible to authorized users

---

*Log entry created: January 2025*
*Status: Resolved*