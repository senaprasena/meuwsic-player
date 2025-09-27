import type { NextApiRequest, NextApiResponse } from 'next'
import { db, tracks, artists, albums } from '../../lib/db'
import { eq, desc } from 'drizzle-orm'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all published tracks with artist and album information
    const allTracks = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        fileName: tracks.fileName,
        fileUrl: tracks.fileUrl,
        duration: tracks.duration,
        fileSize: tracks.fileSize,
        format: tracks.format,
        bitrate: tracks.bitrate,
        sampleRate: tracks.sampleRate,
        year: tracks.year,
        trackNumber: tracks.trackNumber,
        playCount: tracks.playCount,
        createdAt: tracks.createdAt,
        artist: {
          id: artists.id,
          name: artists.name,
          imageUrl: artists.imageUrl,
        },
        album: {
          id: albums.id,
          title: albums.title,
          coverImageUrl: albums.coverImageUrl,
          releaseDate: albums.releaseDate,
        },
      })
      .from(tracks)
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .where(eq(tracks.isPublished, true))
      .orderBy(desc(tracks.createdAt))

    res.status(200).json({
      success: true,
      tracks: allTracks,
      count: allTracks.length
    })

  } catch (error) {
    console.error('Tracks API error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracks',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}