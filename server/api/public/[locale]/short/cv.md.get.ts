import t from '~~/i18n/locales'
import { useExperience } from '~~/server/utils/useExperience'

export default defineEventHandler(async (event) => {
    const locale = getRouterParam(event, 'locale') as keyof typeof t
    const client = useSanity()
    const data = await client.fetch<IndexQuery>(groq`{
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
            "about": about[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": descriptionShort[$locale],
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
        "contact": *[_type == "contact"],
        "allLinks": *[_type == "link"] {
            "label": label[$locale],
            "to": to
        }
    }`, { locale })

    setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')

    return `
        # ${data.summary.title} (${data.summary.status})
        _${data.summary.description}_

        ${data.summary.content.replace(/^::.*\n?/gm, '\n').replaceAll('#', '##')}
        
        ## ${t[locale].sections.skills}
        ${Object.entries(Object.fromEntries(data.skills.map((group) => [
            group.type, 
            group.items.sort((a, b) => b.priority - a.priority)
        ]))).sort(([, aItems], [, bItems]) => bItems.length - aItems.length).map(([type, items]) => `
            ### ${type}
            ${items.map((item) => `${item.name}`).join(', ')}
        `).join('')}
        ## ${t[locale].sections.experience} (${useExperience(event, 
            data.experience.at(-1)?.positions.at(-1)?.duration.from!,
            data.experience.at(0)?.positions.at(0)?.duration.to
        ).duration()})
        ${data.experience.map((experience) => `
            ### ${experience.name}
            ${experience.positions.map((position) => `
                #### ${position.name} (${useExperience(event, position.duration.from, position.duration.to).period()})
                ${position.description}
                **${t[locale].labels.stack}:** ${position.skills.map((skill) => skill.name).join(', ')}
            `).join('')}
            ${experience.footer ? `_${experience.footer}_`.replaceAll('\n', '') : ''}
        `).join('')}

        ## ${t[locale].sections.education}
        ${data.education.map((education) => `
            ### ${education.name}, ${education.faculty}
            **${education.level}**, ${education.specialization} (${education.year})
        `).join('')}

        ## ${t[locale].labels.contact_me}

        ${data.allLinks.map((link) => `- [${link.label}](${link.to})`).join('\n')}
    `.trim().replaceAll('    ', '').replaceAll('\n\n\n', '\n\n').replaceAll('\n\n\n\n', '\n\n')
})