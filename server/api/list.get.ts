import { form } from "~/utils/form"
import { db } from "../db/client"
import { form_requests } from "../db/schema/form_requests.schema"

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    if (!query.token || query.token !== useRuntimeConfig().tg_token) throw createError({ statusCode: 401, statusMessage: 'unauthorized' })

    const data = await db.select().from(form_requests).orderBy(form_requests.date)

    const html = /*html*/`
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>form_requests table</title>
                <style>
                    body { background: black; color: white; margin: 0; padding: 48px; display: flex; flex-direction: column; align-items: center; }
                    table { border-collapse: collapse; max-width: 1200px; }
                    th, td { border: 1px solid #404040; padding: 8px; }
                </style>
            </head>
            <body>
                <h3><pre>form_requests table</pre></h3>
                <table>
                    <thead><tr>${Object.keys(data[0] || {}).map(key => `<th><b><pre>${key}</pre></b></th>`).join('')}</tr></thead>
                    <tbody>${data.map(row => `<tr>${Object.values(row).map(value => `<td><pre>${value}</pre></td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </body>
        </html>
    `

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})
