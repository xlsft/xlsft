<script setup lang="ts">

    const { t } = useI18n()
    const config = useRuntimeConfig().public.config
    const route = useRoute()

    definePageMeta({
        colorMode: 'light',
        layout: 'empty'
    })

    const { data } = await useSanityDynamicQuery<IndexQuery & SeoQuery>(groq`{
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
        "links": {
            "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
            "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
            "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
        },
        "experience": *[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": logo[$theme].asset->url,
            "about": ${route.query.short ? `aboutShort` : `about`}[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": ${route.query.short ? `descriptionShort` : `description`}[$locale],
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
        "seo": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale]
        }, 
        "allLinks": *[_type == "link"] {
            "label": label[$locale],
            "to": to
        },
    }`)

    defineOgImage('AtomsOgIndex.takumi', {
        theme: 'light',
        title: data.value?.summary.title,
        description: data.value?.summary.description,
        photo: data.value?.summary.image,
        status: data.value?.summary.status,
        experience: `${t('sections.experience')}: ${useExperience(
            data.value?.experience?.at(-1)?.positions?.at(-1)?.duration?.from!, 
            data.value?.experience?.at(0)?.positions?.at(0)?.duration?.to
        ).duration()}`,
        url: config.head.url
    })

    useSeoMeta({
        titleTemplate: chunk => `${data.value?.seo.title || ''}${chunk ? ` — ${chunk}` : ``}`,
        title: t('labels.print_version'),
        description: data.value?.seo.description,
        ogTitle: `${data.value?.seo.title} — ${t('labels.print_version')}`,
        ogDescription: data.value?.seo.description
    })
    

    onMounted(() => window.addEventListener('load', () => {
        window.print()
        // window.onfocus = () => window.close()
    }))
    
</script>

<template>
    <template v-if="data">
        <OrganismsSummarySection :data v-if="data.summary"/>

        <MoleculesSectionHeader pattern="architect" v-if="data.experience?.length">
            {{ t('sections.experience') }}<br>
            <span class="text-sm! text-default/50">({{ useExperience(
                data.experience.at(-1)?.positions.at(-1)?.duration.from!, 
                data.experience.at(0)?.positions.at(0)?.duration.to
            ).duration() }})</span>
        </MoleculesSectionHeader>
        <OrganismsExperienceSection :data v-if="data.experience?.length"/>

        <MoleculesSectionHeader pattern="plus" v-if="data.education?.length && !route.query.short">
            <div>{{ t('sections.education') }}</div>
        </MoleculesSectionHeader>
        <OrganismsEducationSection :data v-if="data.education?.length && !route.query.short" />
    </template>
</template>
