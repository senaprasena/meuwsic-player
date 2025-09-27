// Drizzle ORM Schema for MEUWSIC - Neon PostgreSQL
import { pgTable, serial, text, timestamp, boolean, integer, varchar, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'github'
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  providerIdx: index('users_provider_idx').on(table.provider, table.providerId),
}))

// Artists table
export const artists = pgTable('artists', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  bio: text('bio'),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('artists_name_idx').on(table.name),
}))

// Albums table
export const albums = pgTable('albums', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
  coverUrl: varchar('cover_url', { length: 500 }),
  releaseDate: timestamp('release_date'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  artistIdx: index('albums_artist_idx').on(table.artistId),
}))

// Tracks table
export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
  filename: varchar('filename', { length: 255 }).notNull().unique(),
  fileKey: varchar('file_key', { length: 255 }).notNull(), // R2 storage key
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  duration: integer('duration').default(0), // in seconds
  fileSize: integer('file_size').default(0), // in bytes
  mimeType: varchar('mime_type', { length: 100 }).default('audio/mpeg'),
  bitrate: integer('bitrate'),
  sampleRate: integer('sample_rate'),
  genre: varchar('genre', { length: 100 }),
  year: integer('year'),
  trackNumber: integer('track_number'),
  playCount: integer('play_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  filenameIdx: uniqueIndex('tracks_filename_idx').on(table.filename),
  artistIdx: index('tracks_artist_idx').on(table.artistId),
  albumIdx: index('tracks_album_idx').on(table.albumId),
  genreIdx: index('tracks_genre_idx').on(table.genre),
  activeIdx: index('tracks_active_idx').on(table.isActive),
}))

// Playlists table
export const playlists = pgTable('playlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').default(false),
  coverUrl: varchar('cover_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('playlists_user_idx').on(table.userId),
  publicIdx: index('playlists_public_idx').on(table.isPublic),
}))

// Playlist tracks junction table
export const playlistTracks = pgTable('playlist_tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  playlistId: uuid('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => ({
  playlistIdx: index('playlist_tracks_playlist_idx').on(table.playlistId),
  positionIdx: index('playlist_tracks_position_idx').on(table.playlistId, table.position),
  uniqueTrack: uniqueIndex('playlist_tracks_unique').on(table.playlistId, table.trackId),
}))

// User listening history
export const listeningHistory = pgTable('listening_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  playedAt: timestamp('played_at').defaultNow(),
  durationPlayed: integer('duration_played').default(0), // in seconds
  completed: boolean('completed').default(false),
}, (table) => ({
  userIdx: index('listening_history_user_idx').on(table.userId),
  trackIdx: index('listening_history_track_idx').on(table.trackId),
  playedAtIdx: index('listening_history_played_at_idx').on(table.playedAt),
}))

// User favorites
export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('user_favorites_user_idx').on(table.userId),
  uniqueFavorite: uniqueIndex('user_favorites_unique').on(table.userId, table.trackId),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  playlists: many(playlists),
  listeningHistory: many(listeningHistory),
  favorites: many(userFavorites),
}))

export const artistsRelations = relations(artists, ({ many }) => ({
  tracks: many(tracks),
  albums: many(albums),
}))

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
  tracks: many(tracks),
}))

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  artist: one(artists, {
    fields: [tracks.artistId],
    references: [artists.id],
  }),
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  playlistTracks: many(playlistTracks),
  listeningHistory: many(listeningHistory),
  favorites: many(userFavorites),
}))

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
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
}))

export const listeningHistoryRelations = relations(listeningHistory, ({ one }) => ({
  user: one(users, {
    fields: [listeningHistory.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [listeningHistory.trackId],
    references: [tracks.id],
  }),
}))

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [userFavorites.trackId],
    references: [tracks.id],
  }),
}))

// Export types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Artist = typeof artists.$inferSelect
export type NewArtist = typeof artists.$inferInsert
export type Album = typeof albums.$inferSelect
export type NewAlbum = typeof albums.$inferInsert
export type Track = typeof tracks.$inferSelect
export type NewTrack = typeof tracks.$inferInsert
export type Playlist = typeof playlists.$inferSelect
export type NewPlaylist = typeof playlists.$inferInsert
export type PlaylistTrack = typeof playlistTracks.$inferSelect
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert
export type ListeningHistory = typeof listeningHistory.$inferSelect
export type NewListeningHistory = typeof listeningHistory.$inferInsert
export type UserFavorite = typeof userFavorites.$inferSelect
export type NewUserFavorite = typeof userFavorites.$inferInsert