import { createTransport } from 'nodemailer'
import { recipients, render, who } from './render'
import type { RequestFields, RequestProvider } from './types'

/** SMTP provider: one letter per request, updates reply to it so the mail client keeps them in one thread. */
export const email = (): RequestProvider<'email'> => {
    const config = useRuntimeConfig()
    const smtp = config.requests.email
    const source = config.public.site.url
    const to = recipients(smtp.to)
    const enabled = Boolean(smtp.host.length && to.length)
    const thread = (id: string) => `<request-${id.replace(/[^\w.-]/g, '')}@${new URL(source).hostname}>`

    const send = async (fields: RequestFields, message: { subject: string, text: string, messageId?: string, inReplyTo?: string }) => {
        const port = Number(smtp.port) || 465
        const transport = createTransport({
            host: smtp.host,
            port,
            secure: port === 465,
            auth: smtp.user.length ? { user: smtp.user, pass: smtp.password } : undefined,
        })
        await transport.sendMail({
            from: smtp.from.length ? smtp.from : smtp.user,
            to,
            replyTo: fields.email,
            references: message.inReplyTo,
            ...message,
        })
    }

    return {
        name: 'email',
        enabled,
        create: async ({ id, fields }) => send(fields, {
            subject: `Request from ${who(fields)}`,
            text: render(fields, source),
            messageId: thread(id),
        }),
        patch: async ({ id, fields, changed }) => send(fields, {
            subject: `Re: Request from ${who(fields)}`,
            text: render(fields, source, changed),
            inReplyTo: thread(id),
        }),
    }
}
