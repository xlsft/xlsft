import * as z from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const provider = createOpenRouter({
    apiKey: process.env.OPENROUTER_TOKEN,
});

export default defineEventHandler(async (event) => {

    const theme = getRequestHeader(event, 'x-theme')
    const locale = getRequestHeader(event, 'x-locale')

    const data = await useSanity().fetch<Omit<IndexQuery, 'links'>>(groq`{
        "summary": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale],
            "content": content[$locale],
            "image": image.asset->url,
            "status": status[$locale],
        },
        "skills": array::unique(*[_type == "skill"] | order(type asc) { "type": type })[]{
            "type": type,
            "items": *[_type == "skill" && type == ^.type] | order(name asc){
                name,
                color,
                priority
            }
        },
        "experience": *[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": logo[$theme].asset->url,
            "about": about[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": description[$locale],
                "skills": skills[]->{
                    name, type, color, priority
                } | order(priority desc),
                duration,
            } | order(duration.from desc),
            "footer": footer[$locale],
        } | order(positions[0].duration.from desc),
        "education": *[_type == "education"] {
            id, link, year,
            "level": level[$locale],
            "specialization": specialization[$locale],
            "name": name[$locale],
            "faculty": faculty[$locale],
        } | order(year desc),
        "projectTags": array::unique(*[_type == "project"].tags[]),
        "allLinks": *[_type == "link"] {
            "label": label[$locale],
            "to": to
        },
    }`, { theme, locale })

    data.education[0]?.specialization

    const body = z.object({
        messages: z.array(z.string()).min(1),
    }).parse(await readBody(event))

    return streamText({

    })
})
