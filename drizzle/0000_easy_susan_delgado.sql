CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"artist_id" uuid NOT NULL,
	"cover_url" varchar(500),
	"release_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"image_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "artists_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "listening_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"played_at" timestamp DEFAULT now(),
	"duration_played" integer DEFAULT 0,
	"completed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false,
	"cover_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"artist_id" uuid NOT NULL,
	"album_id" uuid,
	"filename" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"duration" integer DEFAULT 0,
	"file_size" integer DEFAULT 0,
	"mime_type" varchar(100) DEFAULT 'audio/mpeg',
	"bitrate" integer,
	"sample_rate" integer,
	"genre" varchar(100),
	"year" integer,
	"track_number" integer,
	"play_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tracks_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "albums_artist_idx" ON "albums" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artists_name_idx" ON "artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "listening_history_user_idx" ON "listening_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listening_history_track_idx" ON "listening_history" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "listening_history_played_at_idx" ON "listening_history" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "playlist_tracks_playlist_idx" ON "playlist_tracks" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "playlist_tracks_position_idx" ON "playlist_tracks" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "playlist_tracks_unique" ON "playlist_tracks" USING btree ("playlist_id","track_id");--> statement-breakpoint
CREATE INDEX "playlists_user_idx" ON "playlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playlists_public_idx" ON "playlists" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_filename_idx" ON "tracks" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "tracks_artist_idx" ON "tracks" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "tracks_album_idx" ON "tracks" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "tracks_genre_idx" ON "tracks" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "tracks_active_idx" ON "tracks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_favorites_user_idx" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_unique" ON "user_favorites" USING btree ("user_id","track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_provider_idx" ON "users" USING btree ("provider","provider_id");