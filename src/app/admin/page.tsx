'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

type PingStatus = 'yellow' | 'green' | 'red' | 'pinging'

interface PingState {
  status: PingStatus
  responseTime?: number
  lastPing?: Date
  message?: string
}

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [pingState, setPingState] = useState<PingState>({ status: 'yellow' })
  const [greenTimeout, setGreenTimeout] = useState<NodeJS.Timeout | null>(null)

  // Database ping function
  const pingDatabase = async (): Promise<void> => {
    if (pingState.status === 'pinging') return // Prevent multiple simultaneous pings
    
    setPingState({ status: 'pinging', message: 'Checking database...' })
    
    try {
      const startTime = Date.now()
      const response = await fetch('/api/database/ping', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      const responseTime = Date.now() - startTime
      
      if (response.ok && data.status === 'active') {
        setPingState({
          status: 'green',
          responseTime: data.responseTime || responseTime,
          lastPing: new Date(),
          message: `Database active (${data.responseTime || responseTime}ms)`
        })
        
        // Clear any existing timeout
        if (greenTimeout) {
          clearTimeout(greenTimeout)
        }
        
        // Set timeout to turn yellow after 5 minutes (Neon databases stay active longer)
        const timeout = setTimeout(() => {
          setPingState(prev => ({
            ...prev,
            status: 'yellow',
            message: 'Database may have gone to sleep - ping before upload'
          }))
        }, 300000) // 5 minutes
        
        setGreenTimeout(timeout)
      } else {
        setPingState({
          status: 'red',
          responseTime: responseTime,
          lastPing: new Date(),
          message: data.message || 'Database connection failed'
        })
      }
    } catch (error) {
      setPingState({
        status: 'red',
        lastPing: new Date(),
        message: 'Network error - cannot reach database'
      })
    }
  }

  // BACK BUTTON SECURITY: Auto-logout on browser navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (session) {
        console.log('🔒 Back button detected - forcing logout for security')
        handleSignOut()
      }
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session) {
        // Clear session data on page unload
        sessionStorage.clear()
        localStorage.removeItem('next-auth.session-token')
      }
    }

    // Add event listeners for security
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session])

  // SESSION TIMEOUT: Auto-logout after inactivity
  useEffect(() => {
    if (!session) return

    const checkSessionTimeout = () => {
      const loginTime = session.loginTime
      const maxAge = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
      
      if (loginTime && (Date.now() - loginTime > maxAge)) {
        console.log('🕐 Session timeout - forcing logout')
        handleSignOut()
      }
    }

    // Check every 5 minutes
    const timeoutCheck = setInterval(checkSessionTimeout, 5 * 60 * 1000)
    
    return () => clearInterval(timeoutCheck)
  }, [session])

  // AUTO-PING: Check database status on component mount
  useEffect(() => {
    if (session && session.isAdmin) {
      console.log('🔄 Auto-pinging database on admin panel load...')
      pingDatabase()
    }
  }, [session])

  const handleSignOut = async () => {
    console.log('🚪 Initiating secure admin logout...')
    try {
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('🧹 Browser caches cleared')
      }

      // Clear storage
      sessionStorage.clear()
      localStorage.clear()
      
      // Sign out with NextAuth
      await signOut({ 
        callbackUrl: '/admin',
        redirect: false 
      })
      
      // Force page reload to ensure clean state
      window.location.replace('/admin')
    } catch (error) {
      console.error('❌ Logout error:', error)
      // Force reload even if signOut fails
      window.location.replace('/admin')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">🔐 Verifying admin access...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">🎵 MEUWSIC Admin</h1>
          
          <button
            onClick={() => signIn('google')}
            className="w-full bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  // Check if user is admin (additional security check)
  if (!session.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-white/80 mb-4">
              You are not authorized to access the admin panel.
            </p>
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <p className="text-white/70 text-sm">
                <strong>Signed in as:</strong> {session.user?.name} ({session.user?.email})
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full bg-red-500/20 text-red-300 px-6 py-3 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleFileUpload = async (files: File[]) => {
    const audioFiles = files.filter(file => file.type.startsWith('audio/'))
    if (audioFiles.length === 0) {
      alert('Please select audio files only')
      return
    }

    // Check ping state before upload
    if (pingState.status !== 'green') {
      console.log('🔄 Database not confirmed active, pinging before upload...')
      
      // Show user that we're pinging
      const originalAlert = window.alert
      window.alert = () => {} // Temporarily disable alerts
      
      try {
        await pingDatabase()
        
        // Wait up to 5 seconds for ping to complete
        let attempts = 0
        const maxAttempts = 50 // 5 seconds (100ms * 50)
        
        while (pingState.status === 'pinging' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        // Restore alert function
        window.alert = originalAlert
        
        // Check final ping state
        if (pingState.status === 'red') {
          alert('❌ Database is not responding. Upload cancelled. Please try again in a few moments.')
          return
        }
        
        if (pingState.status !== 'green') {
          alert('⚠️ Database status unclear. Upload cancelled for safety.')
          return
        }
        
        console.log('✅ Database ping successful, proceeding with upload...')
      } catch (error) {
        window.alert = originalAlert
        alert('❌ Failed to ping database. Upload cancelled.')
        return
      }
    }

    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      audioFiles.forEach(file => {
        formData.append('files', file)
      })

      // Start upload with progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90 // Stop at 90% until real response
          }
          return prev + 10
        })
      }, 300)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      
      const result = await response.json()
      
      if (result.success) {
        setUploadProgress(100)
        alert(`✅ Successfully uploaded ${result.summary.successful} files!`)
        
        // Reset progress after 2 seconds
        setTimeout(() => {
          setUploadProgress(0)
        }, 2000)
      } else {
        setUploadProgress(0)
        alert(`❌ Upload failed: ${result.message}`)
      }
    } catch (error) {
      setUploadProgress(0)
      console.error('Upload error:', error)
      alert('❌ Upload failed. Please try again.')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Secure Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">🎵 MEUWSIC Admin Panel</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white/80 text-sm">Welcome, {session.user?.name}</div>
                <div className="text-white/60 text-xs">
                  Session: {Math.floor((Date.now() - (session.loginTime || 0)) / 60000)}min ago
                </div>
              </div>
              <img 
                src={session.user?.image || ''} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
              <button
                onClick={handleSignOut}
                className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
              >
                🚪 Secure Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Upload Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">📁 Upload Music</h2>
            
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-blue-400 bg-blue-500/20' 
                  : 'border-white/30 hover:border-white/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-white/60 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white mb-2">Drag & drop audio files here</p>
              <p className="text-white/60 text-sm mb-4">or</p>
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Choose Files
              </label>
            </div>

            {uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Library Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">📊 Library Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Total Songs</span>
                <span className="text-white font-semibold">7</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Storage Used</span>
                <span className="text-white font-semibold">~25 MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">CDN Status</span>
                <span className="text-green-400 font-semibold">✅ Cloudflare R2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Last Upload</span>
                <span className="text-white font-semibold">Never</span>
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">🔒 Security Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="text-green-400 font-semibold">✅ OAuth Active</div>
                <div className="text-white/70 text-sm">Google authentication enabled</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="text-green-400 font-semibold">✅ Session Security</div>
                <div className="text-white/70 text-sm">2-hour timeout, back-button protection</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="text-green-400 font-semibold">✅ Cloudflare R2</div>
                <div className="text-white/70 text-sm">Files uploaded to cloud storage</div>
              </div>
              <div className={`rounded-lg p-4 ${
                pingState.status === 'green' ? 'bg-green-500/20' :
                pingState.status === 'red' ? 'bg-red-500/20' :
                pingState.status === 'pinging' ? 'bg-blue-500/20' :
                'bg-yellow-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`font-semibold ${
                    pingState.status === 'green' ? 'text-green-400' :
                    pingState.status === 'red' ? 'text-red-400' :
                    pingState.status === 'pinging' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {pingState.status === 'green' ? '✅' :
                     pingState.status === 'red' ? '❌' :
                     pingState.status === 'pinging' ? '🔄' :
                     '⚠️'} Database Status
                  </div>
                  <button
                    onClick={pingDatabase}
                    disabled={pingState.status === 'pinging'}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      pingState.status === 'pinging' 
                        ? 'bg-blue-500/30 text-blue-300 cursor-not-allowed animate-pulse' 
                        : pingState.status === 'green'
                        ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40'
                        : pingState.status === 'red'
                        ? 'bg-red-500/30 text-red-300 hover:bg-red-500/40'
                        : 'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/40'
                    }`}
                  >
                    {pingState.status === 'pinging' ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Pinging...
                      </span>
                    ) : 'Ping DB'}
                  </button>
                </div>
                <div className="text-white/70 text-sm">
                  {pingState.message || 'Click ping to check database status'}
                </div>
                {pingState.responseTime && (
                  <div className="text-white/50 text-xs mt-1">
                    Response: {pingState.responseTime}ms
                  </div>
                )}
                {pingState.lastPing && (
                  <div className="text-white/50 text-xs">
                    Last ping: {pingState.lastPing.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}