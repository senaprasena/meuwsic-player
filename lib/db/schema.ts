import { pgTable, uuid, varchar, text, integer, timestamp, boolean, decimal, index, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/**
 * Professional Music Streaming Database Schema
 * Designed for AI-driven development with consistent naming and modularity
 * Uses UUID v4 for primary/foreign keys and integers for counters
 * Created: December 2024
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Users table - Core user management
 * Handles authentication, profiles, and user preferences
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), // UUID v4 primary key
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  
  // Counters (integers as requested)
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
  playlistsCount: integer('playlists_count').default(0),
  
  // Timestamps with auto-updating
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  usernameIdx: index('users_username_idx').on(table.username),
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
}))

/**
 * Artists table - Music artists and bands
 * Supports both individual artists and bands
 */
export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(), // URL-friendly identifier
  bio: text('bio'),
  imageUrl: text('image_url'),
  website: varchar('website', { length: 500 }),
  
  // Social media links
  spotifyUrl: varchar('spotify_url', { length: 500 }),
  appleMusicUrl: varchar('apple_music_url', { length: 500 }),
  youtubeUrl: varchar('youtube_url', { length: 500 }),
  
  // Counters
  albumsCount: integer('albums_count').default(0),
  tracksCount: integer('tracks_count').default(0),
  monthlyListeners: integer('monthly_listeners').default(0),
  
  // Status
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('artists_name_idx').on(table.name),
  slugIdx: index('artists_slug_idx').on(table.slug),
  monthlyListenersIdx: index('artists_monthly_listeners_idx').on(table.monthlyListeners),
}))

/**
 * Albums table - Music albums and EPs
 * Links to artists and contains multiple tracks
 */
export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
  
  // Album metadata
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  releaseDate: timestamp('release_date'),
  albumType: varchar('album_type', { length: 20 }).default('album'), // 'album', 'ep', 'single'
  
  // Music industry identifiers
  upc: varchar('upc', { length: 20 }), // Universal Product Code
  catalogNumber: varchar('catalog_number', { length: 50 }),
  recordLabel: varchar('record_label', { length: 255 }),
  
  // Counters
  tracksCount: integer('tracks_count').default(0),
  totalDuration: integer('total_duration').default(0), // in seconds
  playCount: integer('play_count').default(0),
  
  // Status
  isPublished: boolean('is_published').default(false),
  isExplicit: boolean('is_explicit').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('albums_title_idx').on(table.title),
  artistIdIdx: index('albums_artist_id_idx').on(table.artistId),
  releaseDateIdx: index('albums_release_date_idx').on(table.releaseDate),
  albumTypeIdx: index('albums_type_idx').on(table.albumType),
}))

/**
 * Tracks table - Individual music tracks
 * Core entity for audio files with comprehensive metadata
 */
export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  
  // Relationships
  artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // File storage
  fileKey: varchar('file_key', { length: 500 }).notNull().unique(), // R2/S3 object key
  fileUrl: text('file_url').notNull(), // Public URL for streaming
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  
  // Audio metadata
  duration: integer('duration').notNull(), // in seconds
  bitrate: integer('bitrate'), // in kbps
  sampleRate: integer('sample_rate'), // in Hz
  format: varchar('format', { length: 20 }).default('mp3'), // 'mp3', 'flac', 'wav', etc.
  
  // Track metadata
  trackNumber: integer('track_number'),
  discNumber: integer('disc_number').default(1),
  year: integer('year'),
  
  // Music industry identifiers
  isrc: varchar('isrc', { length: 12 }), // International Standard Recording Code
  
  // Counters and engagement
  playCount: integer('play_count').default(0),
  likeCount: integer('like_count').default(0),
  downloadCount: integer('download_count').default(0),
  
  // Status and permissions
  isPublished: boolean('is_published').default(false),
  isExplicit: boolean('is_explicit').default(false),
  allowDownload: boolean('allow_download').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  titleIdx: index('tracks_title_idx').on(table.title),
  artistIdIdx: index('tracks_artist_id_idx').on(table.artistId),
  albumIdIdx: index('tracks_album_id_idx').on(table.albumId),
  fileKeyIdx: index('tracks_file_key_idx').on(table.fileKey),
  uploadedByIdx: index('tracks_uploaded_by_idx').on(table.uploadedBy),
  playCountIdx: index('tracks_play_count_idx').on(table.playCount),
  publishedAtIdx: index('tracks_published_at_idx').on(table.publishedAt),
}))

/**
 * Genres table - Music genres and categories
 * Hierarchical structure supporting sub-genres
 */
export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id'), // For sub-genres - reference added in relations
  
  // Visual
  color: varchar('color', { length: 7 }).default('#000000'), // Hex color for UI
  iconUrl: text('icon_url'),
  
  // Counters
  tracksCount: integer('tracks_count').default(0),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('genres_name_idx').on(table.name),
  slugIdx: index('genres_slug_idx').on(table.slug),
  parentIdIdx: index('genres_parent_id_idx').on(table.parentId),
}))

// ============================================================================
// JUNCTION TABLES
// ============================================================================

/**
 * Track-Genre junction table
 * Many-to-many relationship between tracks and genres
 */
export const trackGenres = pgTable('track_genres', {
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.trackId, table.genreId] }),
  trackIdIdx: index('track_genres_track_id_idx').on(table.trackId),
  genreIdIdx: index('track_genres_genre_id_idx').on(table.genreId),
}))

/**
 * User Liked Tracks junction table
 * Tracks that users have liked/favorited
 */
export const userLikedTracks = pgTable('user_liked_tracks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.trackId] }),
  userIdIdx: index('user_liked_tracks_user_id_idx').on(table.userId),
  trackIdIdx: index('user_liked_tracks_track_id_idx').on(table.trackId),
  createdAtIdx: index('user_liked_tracks_created_at_idx').on(table.createdAt),
}))

// ============================================================================
// PLAYLIST SYSTEM
// ============================================================================

/**
 * Playlists table - User-created playlists
 * Supports both public and private playlists
 */
export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  
  // Ownership
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Visual
  coverImageUrl: text('cover_image_url'),
  
  // Counters
  tracksCount: integer('tracks_count').default(0),
  totalDuration: integer('total_duration').default(0), // in seconds
  followersCount: integer('followers_count').default(0),
  
  // Privacy and permissions
  isPublic: boolean('is_public').default(true),
  isCollaborative: boolean('is_collaborative').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('playlists_title_idx').on(table.title),
  createdByIdx: index('playlists_created_by_idx').on(table.createdBy),
  isPublicIdx: index('playlists_is_public_idx').on(table.isPublic),
  createdAtIdx: index('playlists_created_at_idx').on(table.createdAt),
}))

/**
 * Playlist Tracks junction table
 * Tracks within playlists with ordering
 */
export const playlistTracks = pgTable('playlist_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  playlistId: uuid('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  addedBy: uuid('added_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Ordering
  position: integer('position').notNull(),
  
  // Timestamps
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  playlistIdIdx: index('playlist_tracks_playlist_id_idx').on(table.playlistId),
  trackIdIdx: index('playlist_tracks_track_id_idx').on(table.trackId),
  positionIdx: index('playlist_tracks_position_idx').on(table.playlistId, table.position),
  addedByIdx: index('playlist_tracks_added_by_idx').on(table.addedBy),
}))

// ============================================================================
// LISTENING HISTORY & ANALYTICS
// ============================================================================

/**
 * Play History table - Track listening events
 * Records when users play tracks for analytics
 */
export const playHistory = pgTable('play_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Allow anonymous plays
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  
  // Play details
  playedAt: timestamp('played_at').defaultNow().notNull(),
  duration: integer('duration'), // How long they listened (seconds)
  completionRate: decimal('completion_rate', { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  
  // Context
  source: varchar('source', { length: 50 }), // 'playlist', 'album', 'search', 'radio', etc.
  sourceId: uuid('source_id'), // ID of playlist/album if applicable
  
  // Technical details
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 support
  userAgent: text('user_agent'),
  country: varchar('country', { length: 2 }), // ISO country code
  city: varchar('city', { length: 100 }),
}, (table) => ({
  userIdIdx: index('play_history_user_id_idx').on(table.userId),
  trackIdIdx: index('play_history_track_id_idx').on(table.trackId),
  playedAtIdx: index('play_history_played_at_idx').on(table.playedAt),
  sourceIdx: index('play_history_source_idx').on(table.source, table.sourceId),
}))

// ============================================================================
// RELATIONS
// ============================================================================

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  uploadedTracks: many(tracks),
  likedTracks: many(userLikedTracks),
  playlists: many(playlists),
  playlistTracks: many(playlistTracks),
  playHistory: many(playHistory),
}))

// Artist relations
export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
  tracks: many(tracks),
}))

// Album relations
export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
  tracks: many(tracks),
}))

// Track relations
export const tracksRelations = relations(tracks, ({ one, many }) => ({
  artist: one(artists, {
    fields: [tracks.artistId],
    references: [artists.id],
  }),
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  uploader: one(users, {
    fields: [tracks.uploadedBy],
    references: [users.id],
  }),
  genres: many(trackGenres),
  likedBy: many(userLikedTracks),
  playlistTracks: many(playlistTracks),
  playHistory: many(playHistory),
}))

// Genre relations
export const genresRelations = relations(genres, ({ one, many }) => ({
  parent: one(genres, {
    fields: [genres.parentId],
    references: [genres.id],
  }),
  children: many(genres),
  tracks: many(trackGenres),
}))

// Junction table relations
export const trackGenresRelations = relations(trackGenres, ({ one }) => ({
  track: one(tracks, {
    fields: [trackGenres.trackId],
    references: [tracks.id],
  }),
  genre: one(genres, {
    fields: [trackGenres.genreId],
    references: [genres.id],
  }),
}))

export const userLikedTracksRelations = relations(userLikedTracks, ({ one }) => ({
  user: one(users, {
    fields: [userLikedTracks.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [userLikedTracks.trackId],
    references: [tracks.id],
  }),
}))

// Playlist relations
export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  creator: one(users, {
    fields: [playlists.createdBy],
    references: [users.id],
  }),
  tracks: many(playlistTracks),
}))

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
  addedBy: one(users, {
    fields: [playlistTracks.addedBy],
    references: [users.id],
  }),
}))

// Play history relations
export const playHistoryRelations = relations(playHistory, ({ one }) => ({
  user: one(users, {
    fields: [playHistory.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [playHistory.trackId],
    references: [tracks.id],
  }),
}))

// Export all tables for migrations
export const allTables = {
  users,
  artists,
  albums,
  tracks,
  genres,
  trackGenres,
  userLikedTracks,
  playlists,
  playlistTracks,
  playHistory,
}