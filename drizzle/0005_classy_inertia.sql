CREATE TABLE `creator_seed_state` (
	`seed_key` text PRIMARY KEY NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `creators` ADD `subscriber_count` integer;--> statement-breakpoint
ALTER TABLE `creators` ADD `follower_count` integer;--> statement-breakpoint
ALTER TABLE `creators` ADD `homepage_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `creators` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `creators` ADD `profile_checked_at` text;--> statement-breakpoint
CREATE INDEX `idx_creators_homepage_order` ON `creators` (`active`,`homepage_visible`,`is_live`,`featured`,`sort_order`,`created_at`);