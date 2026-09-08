CREATE TABLE `presence` (
	`visitor_key` text PRIMARY KEY NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_presence_last_seen` ON `presence` (`last_seen_at`);