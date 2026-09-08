CREATE TABLE `admin_vault_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`encrypted_payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_vault_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`verifier` text NOT NULL,
	`created_at` text NOT NULL
);
