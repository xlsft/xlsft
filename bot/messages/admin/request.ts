
import * as z from 'zod'

export default (data: any) => {

    const body = z.object({
        name: z.string('Name is required'),
        email: z.string('Email should be a string').optional(),
        phone: z.string('Phone should be a string').optional(),
        telegram: z.string('Telegram should be a string').optional(),
        description: z.string('Description should be a string').optional(),
    }).parse(data)

    return /*html*/`<strong>New Request!</strong>

<strong>Name</strong>: <code>${body.name || '-'}</code>
<strong>Email</strong>: <code>${body.email || '-'}</code>
<strong>Phone</strong>: <code>${body.phone || '-'}</code>
<strong>Telegram</strong>: <code>${body.telegram || '-'}</code>
<strong>Description</strong>: <blockquote>${body.description || '-'}</blockquote>`
}