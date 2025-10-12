import { pgTable, integer, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

export const canvas = pgTable('canvas', {
    x: integer().notNull(),
    y: integer().notNull(),
    color: integer().notNull(),
    updated_at: timestamp().defaultNow(),
    updated_by: uuid().references(() => user.uuid, { onDelete: 'cascade', onUpdate: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.x, t.y] })
}));