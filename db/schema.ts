import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const inferenceQuota = sqliteTable('inference_quota', {
  userId: text('user_id').primaryKey(),
  day: text('day').notNull(),
  month: text('month').notNull(),
  daily: integer('daily').notNull(),
  monthly: integer('monthly').notNull(),
});
// Seeded by hand (scripts/seed-user.mjs); there is no signup route.
export const users = sqliteTable('users', {
  username: text('username').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: integer('created_at').notNull(),
});
// Same atomic-counter shape as inferenceQuota, keyed by login identity instead of a quota user.
export const loginAttempts = sqliteTable('login_attempts', {
  key: text('key').primaryKey(),
  day: text('day').notNull(),
  count: integer('count').notNull(),
});
