<script setup lang="ts">

    const { t } = useI18n()
    const sectionBorder = 'border-t-8 border-default'
    const theme = useColorMode()
    const config = useRuntimeConfig().public.config

    const { data } = await useClarityDynamicQuery<IndexQuery>(groq`{
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
    }`)

    if (data.value?.summary) defineOgImage('AtomsOgIndex.takumi', {
        theme: theme.value as 'dark' | 'light',
        title: data.value?.summary?.title,
        description: data.value?.summary?.description,
        photo: data.value?.summary?.image,
        status: data.value?.summary?.status,
        experience: `${t('sections.experience')}: ${useExperience(
            data.value?.experience?.at(-1)?.positions?.at(-1)?.duration?.from!,
            data.value?.experience?.at(0)?.positions?.at(0)?.duration?.to
        ).duration()}`,
        url: config.head.url
    })

    useSeoMeta({
        title: t('pages.index'),
        ogTitle: `${data.value?.summary?.title || ''} — ${t('pages.index')}`,
        description: data.value?.summary?.description || '',
        ogDescription: data.value?.summary?.description || ''
    })

</script>

<template>
    <MoleculesSectionHeader pattern="lines-in-motion" class="max-lg:hidden"/>
    <template v-if="data">
        <OrganismsSummarySection :data v-if="data.summary"/>

        <MoleculesHomeSectionHeader :class="sectionBorder" id="experience" filename="experience.conf" echo="($DURATION)" v-if="data.experience?.length">
            ~/{{ t('sections.experience') }}
            <template #detail>
                <span class="text-sm! text-default/50">({{ useExperience(
                    data.experience.at(-1)?.positions.at(-1)?.duration.from!,
                    data.experience.at(0)?.positions.at(0)?.duration.to
                ).duration() }})</span>
            </template>
        </MoleculesHomeSectionHeader>
        <OrganismsExperienceSection :data v-if="data.experience?.length"/>

        <MoleculesHomeSectionHeader :class="sectionBorder" id="education" filename="education.conf" v-if="data.education?.length">
            ~/{{ t('sections.education') }}
        </MoleculesHomeSectionHeader>
        <OrganismsEducationSection :data v-if="data.education?.length" />
        <OrganismsProjectsSection id="projects" :class="sectionBorder" :data/>
    </template>
</template>
