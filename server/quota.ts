export const quotaSQL = `INSERT INTO inference_quota (user_id, day, month, daily, monthly)
VALUES (?1, ?2, ?3, 1, 1)
ON CONFLICT(user_id) DO UPDATE SET
 day = excluded.day,
 month = excluded.month,
 daily = CASE WHEN inference_quota.day = excluded.day THEN inference_quota.daily + 1 ELSE 1 END,
 monthly = CASE WHEN inference_quota.month = excluded.month THEN inference_quota.monthly + 1 ELSE 1 END
WHERE (inference_quota.day != excluded.day OR inference_quota.daily < 10)
 AND (inference_quota.month != excluded.month OR inference_quota.monthly < 150)
RETURNING daily`;
export interface QuotaDB {
 prepare(sql: string): { bind(...values: string[]): { first(): Promise<unknown> } };
}
export async function consumeQuota(db: QuotaDB, user: string, now = new Date()) {
 const day = now.toISOString().slice(0, 10);
 return !!(await db.prepare(quotaSQL).bind(user, day, day.slice(0, 7)).first());
}
