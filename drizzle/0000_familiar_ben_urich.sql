CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`submission_id` integer,
	`detail` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_created` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_player_id_unique` ON `players` (`player_id`);--> statement-breakpoint
CREATE TABLE `scan_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`period_id` integer,
	`power` integer NOT NULL,
	`kills` integer NOT NULL,
	`defeat` integer NOT NULL,
	`troops` integer NOT NULL,
	`screenshot_key` text,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	FOREIGN KEY (`period_id`) REFERENCES `scan_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_submissions_player_date` ON `submissions` (`player_id`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `idx_submissions_status` ON `submissions` (`status`);