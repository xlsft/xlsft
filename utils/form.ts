import type { Contact } from "grammy/types"
import { bot } from "./bot"
import { db } from "~/server/db/client"
import { request } from "~/server/db/schema/request.schema"

export const form = async (body: { name: string, description: string, contact: string }, source: string) => {
    const recipient = useRuntimeConfig().tg_user
    const contact = body.contact.startsWith('<contact/>') ? JSON.parse(body.contact.split('<contact/>').join('')) as Contact : null
    const message = await bot.api.sendMessage(recipient, `<b>Новая заявка на форму (${source})</b>\n\nНазвание: ${body.name}\nОписание: ${body.description}${!contact ? `\nКонтактные данные: ${body.contact}` : '\n<i>Вложенный контакт телеграм</i>'}`, { parse_mode: 'HTML', link_preview_options: { prefer_large_media: true, show_above_text: true } })
    if (contact) await bot.api.sendContact(recipient, contact.phone_number, `${contact.first_name} (Заявка с бота)`)
    await db.insert(request).values({
        name: body.name,
        description: body.description,
        contact: contact ? JSON.stringify(contact) : body.contact,
        source,
    })

    return { message }
}