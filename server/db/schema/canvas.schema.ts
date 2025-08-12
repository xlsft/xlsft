import { index, integer, pgTable, point, serial, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { user } from './user.schema'

export const canvas = pgTable('canvas', {
    coordinates: text().unique().notNull().primaryKey(),
    color: integer(),
    updated_at: timestamp().defaultNow(),
    updated_by: uuid().references(() => user.uuid, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
    })
})
