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
