import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  createdAt: text('created_at').notNull(),
});

export const scanPeriods = sqliteTable('scan_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at'),
  createdAt: text('created_at').notNull(),
});

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').notNull(),
  playerName: text('player_name').notNull(),
  periodId: integer('period_id').references(() => scanPeriods.id),
  power: integer('power').notNull(),
  kills: integer('kills').notNull(),
  defeat: integer('defeat').notNull(),
  troops: integer('troops').notNull(),
  screenshotKey: text('screenshot_key'),
  note: text('note'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  submittedAt: text('submitted_at').notNull(),
  reviewedAt: text('reviewed_at'),
  reviewedBy: text('reviewed_by'),
}, (table) => [
  index('idx_submissions_player_date').on(table.playerId, table.submittedAt),
  index('idx_submissions_status').on(table.status),
]);

export const auditEvents = sqliteTable('audit_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  submissionId: integer('submission_id').references(() => submissions.id),
  detail: text('detail'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_audit_events_created').on(table.createdAt)]);

export const presence = sqliteTable('presence', {
  visitorKey: text('visitor_key').primaryKey(),
  lastSeenAt: text('last_seen_at').notNull(),
}, (table) => [index('idx_presence_last_seen').on(table.lastSeenAt)]);

// The server stores only ciphertext. The vault passphrase never leaves the admin's browser.
export const adminVaultSettings = sqliteTable('admin_vault_settings', {
  id: integer('id').primaryKey(),
  salt: text('salt').notNull(),
  verifier: text('verifier').notNull(),
  createdAt: text('created_at').notNull(),
});

export const adminVaultEntries = sqliteTable('admin_vault_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  encryptedPayload: text('encrypted_payload').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const accountListings = sqliteTable('account_listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').notNull(),
  title: text('title').notNull(),
  mainSpec: text('main_spec').notNull(),
  kingdom: text('kingdom').notNull(),
  totalPower: text('total_power').notNull(),
  killPoints: text('kill_points').notNull(),
  vipLevel: text('vip_level').notNull(),
  totalTroops: text('total_troops').notNull(),
  price: text('price').notNull(),
  paymentMethods: text('payment_methods').notNull(),
  ownerDiscord: text('owner_discord').notNull(),
  intermediaryDiscord: text('intermediary_discord'),
  status: text('status', { enum: ['published', 'hidden'] }).notNull().default('published'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_account_listings_player').on(table.playerId),
  index('idx_account_listings_status').on(table.status, table.createdAt),
]);

export const accountListingImages = sqliteTable('account_listing_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listingId: integer('listing_id').notNull().references(() => accountListings.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  position: integer('position').notNull(),
}, (table) => [index('idx_account_listing_images_listing').on(table.listingId, table.position)]);
