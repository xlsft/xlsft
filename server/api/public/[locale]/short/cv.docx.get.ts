import t from '~~/i18n/locales'
import { useExperience } from '~~/server/utils/useExperience'
import docx, { Packer } from 'markdown-docx';
import { styles } from 'markdown-docx';

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
            "logo": logo.light.asset->url,
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

    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8')

    return await Packer.toBlob(await docx(`
        ${data.summary.content.replace(/^::.*\n?/gm, '\n')}
        ## ${t[locale].sections.skills}
        ${Object.entries(Object.fromEntries(data.skills.map((group) => [
            group.type, 
            group.items.sort((a, b) => b.priority - a.priority)
        ]))).sort(([, aItems], [, bItems]) => bItems.length - aItems.length).map(([type, items]) => `${type}: ${items.map((item) => `${item.name}`).join(', ')}`).join('\n')}
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
    `.trim().replaceAll('    ', '').replaceAll('\n\n\n', '\n\n').replaceAll('\n\n\n\n', '\n\n'), {
        
        theme: {
            spaceSize: 1,
            heading1: "000000",
            heading2: "000000",
            heading3: "000000",
            heading4: "000000",
            heading5: "000000",
            heading6: "888888",
            link: "888888",
            code: "888888",
            blockquote: "888888",
            del: "888888",
        }
    }))
})