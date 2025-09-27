import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../lib/db'
import { tracks, artists, albums, playlists, playlistTracks, playHistory, userLikedTracks, trackGenres, users, genres } from '../../lib/db/schema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { confirmCleanup } = req.body

    if (!confirmCleanup) {
      return res.status(400).json({ 
        error: 'Confirmation required',
        message: 'Send { "confirmCleanup": true } to proceed with database cleanup'
      })
    }

    console.log('🗑️ Starting database cleanup...')

    // Delete in order to respect foreign key constraints
    const deletedCounts = {
      playHistory: 0,
      playlistTracks: 0,
      playlists: 0,
      userLikedTracks: 0,
      trackGenres: 0,
      tracks: 0,
      albums: 0,
      artists: 0,
      genres: 0,
      users: 0,
    }

    // 1. Delete play history first
    const deletedHistory = await db.delete(playHistory)
    deletedCounts.playHistory = deletedHistory.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.playHistory} play history records`)

    // 2. Delete playlist tracks
    const deletedPlaylistTracks = await db.delete(playlistTracks)
    deletedCounts.playlistTracks = deletedPlaylistTracks.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.playlistTracks} playlist track associations`)

    // 3. Delete playlists
    const deletedPlaylists = await db.delete(playlists)
    deletedCounts.playlists = deletedPlaylists.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.playlists} playlists`)

    // 4. Delete user liked tracks
    const deletedLikedTracks = await db.delete(userLikedTracks)
    deletedCounts.userLikedTracks = deletedLikedTracks.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.userLikedTracks} liked track associations`)

    // 5. Delete track genres
    const deletedTrackGenres = await db.delete(trackGenres)
    deletedCounts.trackGenres = deletedTrackGenres.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.trackGenres} track genre associations`)

    // 6. Delete tracks
    const deletedTracks = await db.delete(tracks)
    deletedCounts.tracks = deletedTracks.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.tracks} tracks`)

    // 7. Delete albums
    const deletedAlbums = await db.delete(albums)
    deletedCounts.albums = deletedAlbums.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.albums} albums`)

    // 8. Delete artists
    const deletedArtists = await db.delete(artists)
    deletedCounts.artists = deletedArtists.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.artists} artists`)

    // 9. Delete genres (no foreign key dependencies)
    const deletedGenres = await db.delete(genres)
    deletedCounts.genres = deletedGenres.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.genres} genres`)

    // 10. Delete users (keep system users or delete all based on requirements)
    // Note: This will delete ALL users including system users
    // If you want to preserve system users, add a WHERE clause
    const deletedUsers = await db.delete(users)
    deletedCounts.users = deletedUsers.rowCount || 0
    console.log(`✅ Deleted ${deletedCounts.users} users`)

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)

    return res.status(200).json({
      success: true,
      message: `Database cleanup completed. Deleted ${totalDeleted} total records.`,
      deletedCounts,
      totalDeleted
    })

  } catch (error) {
    console.error('Database cleanup error:', error)
    return res.status(500).json({ 
      error: 'Failed to cleanup database',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}