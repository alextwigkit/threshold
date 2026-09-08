import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const inferenceQuota = sqliteTable('inference_quota', {
 userId: text('user_id').primaryKey(),
 day: text('day').notNull(),
 month: text('month').notNull(),
 daily: integer('daily').notNull(),
 monthly: integer('monthly').notNull(),
});
