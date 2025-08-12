import { bigint, boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
    uuid: uuid().notNull().unique().primaryKey(),
    id: bigint({ mode: 'number' }).notNull().unique(),
    name: text().notNull(),
    online: boolean().default(false)
})
