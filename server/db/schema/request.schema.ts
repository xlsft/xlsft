import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const request = pgTable('request', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    contact: text('contact').notNull(),
    source: text('source').notNull(),
    date: timestamp('date').defaultNow().notNull(),
})
