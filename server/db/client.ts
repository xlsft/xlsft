import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/form_requests.schema'

const pool = new Pool({
    host: 'postgress.xlsft.ru',
    database: 'xlsft.ru',
    user: 'admin',
    password: useRuntimeConfig().db_password,
    port: 5432
})

export const db = drizzle(pool, { schema })