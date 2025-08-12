import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    dialect: 'postgresql',
    schema: './server/db/schema/*',
    out: './server/db/drizzle',
    dbCredentials: {
        host: 'postgress.xlsft.ru',
        database: 'xlsft.ru',
        user: 'admin',
        password: process.env.DB_PASSWORD,
        port: 5432,
        ssl: false
    },
})
