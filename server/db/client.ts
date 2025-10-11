import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/request.schema'

const pool = new Pool({
    connectionString: useRuntimeConfig().db_url,
})

export const db = drizzle(pool, { schema })