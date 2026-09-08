CREATE TABLE `account_listing_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `account_listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_account_listing_images_listing` ON `account_listing_images` (`listing_id`,`position`);--> statement-breakpoint
CREATE TABLE `account_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`title` text NOT NULL,
	`main_spec` text NOT NULL,
	`kingdom` text NOT NULL,
	`total_power` text NOT NULL,
	`kill_points` text NOT NULL,
	`vip_level` text NOT NULL,
	`total_troops` text NOT NULL,
	`price` text NOT NULL,
	`payment_methods` text NOT NULL,
	`owner_discord` text NOT NULL,
	`intermediary_discord` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_account_listings_player` ON `account_listings` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_account_listings_status` ON `account_listings` (`status`,`created_at`);