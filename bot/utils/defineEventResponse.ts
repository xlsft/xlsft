import { photo, type ExtendedContext } from "..";
import type { Message } from "grammy/types";
import { convert } from 'telegram-markdown-v2';

export const defineEventResponse = async (
    ctx: ExtendedContext, 
    message: string, 
    options: Parameters<typeof ctx.replyWithPhoto>[1] & Parameters<typeof ctx.editMessageCaption>[0] = {}
) => { try {
    const slice = convert(message.trim().replaceAll('    ', '') || '').slice(0, 1020)
    const caption = slice + (slice.length > 1020 ? '...' : '')
    let response: Message.CaptionableMessage | boolean
    if (!ctx.callbackQuery?.message?.message_id) response = await ctx.replyWithPhoto(photo, { ...options, caption, parse_mode: 'MarkdownV2' })
    else response = await ctx.editMessageCaption({ ...options, caption, parse_mode: 'MarkdownV2' })     
    return response
} catch (error) { console.error(error) }}