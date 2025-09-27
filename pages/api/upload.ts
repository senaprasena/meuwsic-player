import { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm, File } from 'formidable'
import { promises as fs } from 'fs'
import { parseBuffer } from 'music-metadata'
import { r2Client } from '../../lib/r2-client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '../../lib/db'
import { tracks, artists, albums, users } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { AudioValidator } from '../../lib/audio-validator'
import { randomUUID } from 'crypto'
import { recordUploadAttempt } from './admin/upload-report'

// Disable default body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}

interface UploadedFile extends File {
  filepath: string
  originalFilename: string | null
  mimetype: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the multipart form data
    const form = new IncomingForm({
      uploadDir: './tmp',
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB per file limit
      maxTotalFileSize: 200 * 1024 * 1024, // 200MB total limit for all files combined
      maxFields: 1000,
      maxFieldsSize: 20 * 1024 * 1024, // 20MB for form fields
    })

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files]
    const results = []

    for (const file of uploadedFiles) {
      if (!file) continue

      const uploadedFile = file as UploadedFile
      
      // Validate file type
      if (!uploadedFile.mimetype?.startsWith('audio/')) {
        results.push({
          filename: uploadedFile.originalFilename,
          error: 'Invalid file type. Only audio files are allowed.'
        })
        continue
      }

      try {
        // Read file buffer for metadata extraction
        const fileBuffer = await fs.readFile(uploadedFile.filepath)
        
        // Validate audio file integrity and extract accurate metadata
        const { validation, recommendations } = await AudioValidator.validateUpload(
          fileBuffer, 
          uploadedFile.originalFilename || 'unknown'
        )

        if (!validation.isValid) {
          results.push({
            filename: uploadedFile.originalFilename,
            error: `Audio validation failed: ${validation.errors.join(', ')}`,
            recommendations,
            success: false
          })
          continue
        }

        // Use validated duration and metadata
        const validatedDuration = validation.duration
        const validatedBitrate = validation.bitrate
        const validatedSampleRate = validation.sampleRate
        
        // Extract additional metadata for database storage
        let metadata
        try {
          metadata = await parseBuffer(fileBuffer)
        } catch (metadataError) {
          console.warn('Could not extract additional metadata:', metadataError)
          metadata = null
        }

        // Generate UUID-based filename
        const fileUuid = randomUUID()
        const fileExtension = uploadedFile.originalFilename?.split('.').pop() || 'mp3'
        const sanitizedName = uploadedFile.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'unknown'
        const key = `music/${fileUuid}-${sanitizedName}`

        // Upload to Cloudflare R2
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
          Body: fileBuffer,
          ContentType: uploadedFile.mimetype || 'audio/mpeg',
          Metadata: {
            originalName: uploadedFile.originalFilename || 'unknown',
            uploadedAt: new Date().toISOString(),
            title: metadata?.common?.title || 'Unknown Title',
            artist: metadata?.common?.artist || 'Unknown Artist',
            album: metadata?.common?.album || 'Unknown Album',
            duration: validatedDuration.toString(),
            validatedDuration: validation.actualDuration?.toString() || validatedDuration.toString(),
            bitrate: validatedBitrate?.toString() || metadata?.format?.bitrate?.toString() || '0',
            sampleRate: validatedSampleRate?.toString() || metadata?.format?.sampleRate?.toString() || '0',
            validationWarnings: validation.warnings.join('; ') || 'none',
          }
        })

        await r2Client.send(uploadCommand)

        // Generate public URL
        const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

        // Store in database
        let artistId: string | null = null
        let albumId: string | null = null
        
        // Find or create artist (always create one if none exists)
        const artistName = metadata?.common?.artist || 'Unknown Artist'
        const artistSlug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        const existingArtist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1)
        
        if (existingArtist.length > 0) {
          artistId = existingArtist[0].id
        } else {
          const [newArtist] = await db.insert(artists).values({
            name: artistName,
            slug: artistSlug,
            bio: null,
            imageUrl: null,
          }).returning()
          artistId = newArtist.id
        }

        // Find or create album (only if we have album info)
        if (metadata?.common?.album && artistId) {
          const albumTitle = metadata.common.album
          const albumSlug = albumTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          const existingAlbum = await db.select().from(albums).where(eq(albums.title, albumTitle)).limit(1)
          
          if (existingAlbum.length > 0) {
            albumId = existingAlbum[0].id
          } else {
            const [newAlbum] = await db.insert(albums).values({
              title: albumTitle,
              slug: albumSlug,
              artistId: artistId,
              releaseDate: metadata.common.year ? new Date(metadata.common.year, 0, 1) : null,
              coverImageUrl: null,
            }).returning()
            albumId = newAlbum.id
          }
        }

        // Get or create system user for uploads (temporary until auth is implemented)
        const systemUserEmail = 'system@meuwsic.app'
        let systemUserId: string
        const existingSystemUser = await db.select().from(users).where(eq(users.email, systemUserEmail)).limit(1)
        
        if (existingSystemUser.length > 0) {
          systemUserId = existingSystemUser[0].id
        } else {
          const [newSystemUser] = await db.insert(users).values({
            email: systemUserEmail,
            username: 'system',
            displayName: 'System User',
            passwordHash: 'system_user_no_login',
            isVerified: true,
          }).returning()
          systemUserId = newSystemUser.id
        }

        // Generate track slug
        const trackTitle = metadata?.common?.title || uploadedFile.originalFilename?.replace(/\.[^/.]+$/, '') || 'Unknown Title'
        const trackSlug = trackTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

        // Insert track into database with new schema
        const [dbTrack] = await db.insert(tracks).values({
          title: trackTitle,
          slug: trackSlug,
          artistId: artistId,
          albumId: albumId,
          uploadedBy: systemUserId, // Required field in new schema
          fileKey: key,
          fileUrl: publicUrl,
          fileName: uploadedFile.originalFilename || 'unknown.mp3',
          fileSize: fileBuffer.length,
          duration: validatedDuration,
          bitrate: validatedBitrate || (metadata?.format?.bitrate ? Math.round(metadata.format.bitrate) : null),
          sampleRate: validatedSampleRate || (metadata?.format?.sampleRate ? Math.round(metadata.format.sampleRate) : null),
          format: fileExtension,
          trackNumber: metadata?.common?.track?.no || null,
          year: metadata?.common?.year || null,
          isPublished: true, // Auto-publish uploads for now
          playCount: 0,
        }).returning()

        // Prepare result
        const result = {
          filename: uploadedFile.originalFilename,
          key,
          publicUrl,
          size: fileBuffer.length,
          trackId: dbTrack.id,
          validation: {
            isValid: validation.isValid,
            duration: validatedDuration,
            actualDuration: validation.actualDuration,
            warnings: validation.warnings,
            recommendations
          },
          metadata: {
            title: metadata?.common?.title || uploadedFile.originalFilename?.replace(/\.[^/.]+$/, '') || 'Unknown Title',
            artist: metadata?.common?.artist || 'Unknown Artist',
            album: metadata?.common?.album || 'Unknown Album',
            duration: validatedDuration, // Use validated duration
            genre: metadata?.common?.genre?.[0] || 'Unknown',
            year: metadata?.common?.year || null,
            track: metadata?.common?.track?.no || null,
            bitrate: validatedBitrate,
            sampleRate: validatedSampleRate,
          },
          success: true
        }

        results.push(result)

        // Record successful upload
        recordUploadAttempt({
          filename: uploadedFile.originalFilename || 'unknown',
          status: 'success',
          fileSize: fileBuffer.length,
          duration: validatedDuration
        })

        // Clean up temporary file
        try {
          await fs.unlink(uploadedFile.filepath)
        } catch (cleanupError) {
          console.warn('Could not clean up temp file:', cleanupError)
        }

      } catch (uploadError) {
        console.error('Upload error for file:', uploadedFile.originalFilename, uploadError)
        
        // Categorize error type
        let errorType = 'unknown'
        let errorMessage = (uploadError as Error).message
        
        if (errorMessage.includes('Audio validation failed')) {
          errorType = 'audio_validation'
        } else if (errorMessage.includes('database') || errorMessage.includes('constraint')) {
          errorType = 'database'
        } else if (errorMessage.includes('Cloudflare') || errorMessage.includes('S3') || errorMessage.includes('bucket')) {
          errorType = 'cloudflare_r2'
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          errorType = 'network'
        } else if (errorMessage.includes('file') && errorMessage.includes('size')) {
          errorType = 'file_size'
        } else if (errorMessage.includes('metadata') || errorMessage.includes('format')) {
          errorType = 'file_format'
        }
        
        // Record failed upload
        recordUploadAttempt({
          filename: uploadedFile.originalFilename || 'unknown',
          status: 'failed',
          errorType,
          errorMessage,
          fileSize: uploadedFile.size
        })
        
        results.push({
          filename: uploadedFile.originalFilename,
          error: 'Upload failed: ' + errorMessage,
          success: false
        })

        // Clean up temporary file on error
        try {
          await fs.unlink(uploadedFile.filepath)
        } catch (cleanupError) {
          console.warn('Could not clean up temp file:', cleanupError)
        }
      }
    }

    // Return results
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    res.status(200).json({
      success: errorCount === 0,
      message: `Uploaded ${successCount} files successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      }
    })

  } catch (error) {
    console.error('Upload API error:', error)
    res.status(500).json({
      error: 'Upload failed',
      message: (error as Error).message
    })
  }
}