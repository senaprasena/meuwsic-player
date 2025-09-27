import { NextApiRequest, NextApiResponse } from 'next'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2Client } from '../../../lib/r2-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { path } = req.query
    
    if (!path || !Array.isArray(path)) {
      return res.status(400).json({ error: 'Invalid path' })
    }

    // Reconstruct the full path
    const fullPath = path.join('/')
    
    // Get the file from R2
    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fullPath,
    })

    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', response.ContentType || 'audio/mpeg')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
    
    // Handle range requests for audio seeking
    const range = req.headers.range
    if (range && response.ContentLength) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : response.ContentLength - 1
      
      // Request the specific range from R2
      const rangeCommand = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: fullPath,
        Range: `bytes=${start}-${end}`
      })
      
      const rangeResponse = await r2Client.send(rangeCommand)
      const chunksize = (end - start) + 1
      
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${response.ContentLength}`)
      res.setHeader('Content-Length', chunksize.toString())
      
      // Stream the ranged content
      const rangeStream = rangeResponse.Body as NodeJS.ReadableStream
      rangeStream.pipe(res)
    } else {
      res.setHeader('Content-Length', response.ContentLength?.toString() || '0')
      
      // Stream the full file
      const stream = response.Body as NodeJS.ReadableStream
      stream.pipe(res)
    }
    
  } catch (error) {
    console.error('Error serving audio file:', error)
    res.status(500).json({ error: 'Failed to serve audio file' })
  }
}