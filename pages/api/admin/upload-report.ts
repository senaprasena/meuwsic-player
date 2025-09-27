import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { getSession } from 'next-auth/react'
import { db, tracks } from '../../../lib/db'
import { desc, sql, count, eq } from 'drizzle-orm'

interface UploadStats {
  totalUploads: number
  successfulUploads: number
  failedUploads: number
  successRate: number
  recentUploads: Array<{
    id: string
    title: string
    filename: string
    fileSize: number
    createdAt: Date
    status: 'success' | 'failed'
    errorMessage?: string
  }>
  errorBreakdown: Array<{
    errorType: string
    count: number
    percentage: number
  }>
}

// In-memory storage for upload attempts (in production, use Redis or database)
let uploadAttempts: Array<{
  id: string
  filename: string
  timestamp: Date
  status: 'success' | 'failed'
  errorType?: string
  errorMessage?: string
  fileSize?: number
  duration?: number
}> = []

export function recordUploadAttempt(data: {
  filename: string
  status: 'success' | 'failed'
  errorType?: string
  errorMessage?: string
  fileSize?: number
  duration?: number
}) {
  uploadAttempts.push({
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    timestamp: new Date()
  })
  
  // Keep only last 1000 attempts
  if (uploadAttempts.length > 1000) {
    uploadAttempts = uploadAttempts.slice(-1000)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if user is admin - simplified check for now
    // TODO: Implement proper admin authentication
    // const session = await getServerSession(req, res)
    // if (!session?.user?.email || !['senaprasena@gmail.com'].includes(session.user.email)) {
    //   return res.status(403).json({ error: 'Admin access required' })
    // }

    // Get successful uploads from database
    const successfulTracks = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        filename: tracks.fileName,
        fileSize: tracks.fileSize,
        createdAt: tracks.createdAt
      })
      .from(tracks)
      .where(eq(tracks.isPublished, true))
      .orderBy(desc(tracks.createdAt))
      .limit(50)

    // Calculate statistics
    const totalAttempts = uploadAttempts.length
    const successfulAttempts = uploadAttempts.filter(a => a.status === 'success').length
    const failedAttempts = uploadAttempts.filter(a => a.status === 'failed').length
    
    // Error breakdown
    const errorTypes = new Map<string, number>()
    uploadAttempts
      .filter(a => a.status === 'failed' && a.errorType)
      .forEach(a => {
        const type = a.errorType!
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1)
      })

    const errorBreakdown = Array.from(errorTypes.entries()).map(([errorType, count]) => ({
      errorType,
      count,
      percentage: Math.round((count / failedAttempts) * 100) || 0
    })).sort((a, b) => b.count - a.count)

    // Recent uploads (combine successful from DB and failed from memory)
    const recentUploads = [
      ...successfulTracks.map(track => ({
        id: track.id,
        title: track.title,
        filename: track.filename,
        fileSize: track.fileSize || 0,
        createdAt: track.createdAt!,
        status: 'success' as const
      })),
      ...uploadAttempts
        .filter(a => a.status === 'failed')
        .slice(-25)
        .map(attempt => ({
          id: attempt.id,
          title: attempt.filename.replace(/\.[^/.]+$/, ''),
          filename: attempt.filename,
          fileSize: attempt.fileSize || 0,
          createdAt: attempt.timestamp,
          status: 'failed' as const,
          errorMessage: attempt.errorMessage
        }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)

    const stats: UploadStats = {
      totalUploads: totalAttempts,
      successfulUploads: successfulAttempts,
      failedUploads: failedAttempts,
      successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0,
      recentUploads,
      errorBreakdown
    }

    res.status(200).json(stats)

  } catch (error) {
    console.error('Upload report error:', error)
    res.status(500).json({
      error: 'Failed to generate upload report',
      message: (error as Error).message
    })
  }
}