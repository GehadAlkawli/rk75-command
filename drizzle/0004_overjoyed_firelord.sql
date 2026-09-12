CREATE TABLE `creators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`platform_username` text NOT NULL,
	`platform_channel_id` text,
	`original_url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`team_id` text,
	`featured` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`live_status` text DEFAULT 'unknown' NOT NULL,
	`current_stream_id` text,
	`current_video_id` text,
	`stream_title` text,
	`thumbnail_url` text,
	`viewer_count` integer,
	`category` text,
	`stream_started_at` text,
	`last_checked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_creators_platform_username` ON `creators` (`platform`,`platform_username`);--> statement-breakpoint
CREATE INDEX `idx_creators_active_live` ON `creators` (`active`,`is_live`,`featured`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`media_type` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `media_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_post` ON `media_assets` (`post_id`,`position`);--> statement-breakpoint
CREATE TABLE `media_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'short' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_media_posts_created` ON `media_posts` (`created_at`);--> statement-breakpoint
ALTER TABLE `account_listing_images` ADD `media_type` text DEFAULT 'image' NOT NULL;