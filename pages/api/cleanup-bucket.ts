import { NextApiRequest, NextApiResponse } from 'next'
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { r2Client } from '../../lib/r2-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { filesToDelete, deleteAll = false } = req.body

    if (!filesToDelete && !deleteAll) {
      return res.status(400).json({ error: 'No files specified for deletion' })
    }

    let deletedCount = 0
    let errors: string[] = []

    if (deleteAll) {
      // Delete all files in bucket
      console.log('🗑️ Deleting ALL files from R2 bucket...')
      
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!
      })

      const listResponse = await r2Client.send(listCommand)
      
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            try {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Key: object.Key
              })
              
              await r2Client.send(deleteCommand)
              deletedCount++
              console.log(`✅ Deleted: ${object.Key}`)
            } catch (error) {
              const errorMsg = `Failed to delete ${object.Key}: ${error}`
              errors.push(errorMsg)
              console.error(`❌ ${errorMsg}`)
            }
          }
        }
      }
    } else {
      // Delete specific files
      console.log(`🗑️ Deleting ${filesToDelete.length} specific files...`)
      
      for (const filename of filesToDelete) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            Key: filename
          })
          
          await r2Client.send(deleteCommand)
          deletedCount++
          console.log(`✅ Deleted: ${filename}`)
        } catch (error) {
          const errorMsg = `Failed to delete ${filename}: ${error}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }
    }

    return res.status(200).json({
      success: true,
      deletedCount,
      errors,
      message: `Successfully deleted ${deletedCount} files${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    })

  } catch (error) {
    console.error('Cleanup bucket error:', error)
    return res.status(500).json({ 
      error: 'Failed to cleanup bucket',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}