// Database connection for MEUWSIC - Neon PostgreSQL with Drizzle ORM
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create the connection
const sql = neon(process.env.DATABASE_URL)

// Create the database instance with schema
export const db = drizzle(sql, { schema })

// Export schema for use in other files
export * from './schema'

// Database connection test
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Helper function to get database stats
export async function getDatabaseStats() {
  try {
    const [userCount] = await sql`SELECT COUNT(*) as count FROM users`
    const [trackCount] = await sql`SELECT COUNT(*) as count FROM tracks`
    const [artistCount] = await sql`SELECT COUNT(*) as count FROM artists`
    const [playlistCount] = await sql`SELECT COUNT(*) as count FROM playlists`
    
    return {
      users: parseInt(userCount.count),
      tracks: parseInt(trackCount.count),
      artists: parseInt(artistCount.count),
      playlists: parseInt(playlistCount.count),
    }
  } catch (error) {
    console.error('Error getting database stats:', error)
    return {
      users: 0,
      tracks: 0,
      artists: 0,
      playlists: 0,
    }
  }
}