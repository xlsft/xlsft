<script setup lang="ts">

    const { t } = useI18n()
    const config = useRuntimeConfig().public.config
    const route = useRoute()
    const router = useRouter()

    definePageMeta({
        colorMode: 'light',
        layout: 'empty'
    })

    type PrintData = Omit<IndexQuery, 'skills'> & SeoQuery & { skills: Skill[] }
    const { data: records } = await useClarityDynamicQuery<PrintData>(groq`{
        "summary": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale],
            "content": content[$locale],
            "image": image.asset->url,
            "status": status[$locale],
        },
        "skills": *[_type == "skill"] | order(type asc, name asc) { type, name, color, priority },
        "links": {
            "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
            "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
            "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
        },
        "experience": *[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
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

    // навыки плоским списком → группы по типу, как на главной
    const data = computed(() => {
        if (!records.value) return null
        const categories = new Map<string, Skill[]>()
        for (const skill of records.value.skills ?? []) {
            const items = categories.get(skill.type)
            if (items) items.push(skill)
            else categories.set(skill.type, [skill])
        }
        return {
            ...records.value,
            skills: Array.from(categories, ([type, items]) => ({ type, items }))
        }
    })

    if (data.value?.summary) defineOgImage('AtomsOgIndex.takumi', {
        theme: 'light',
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
        titleTemplate: chunk => `${data.value?.seo?.title || ''}${chunk ? ` — ${chunk}` : ``}`,
        title: t('labels.print_version'),
        description: data.value?.seo?.description,
        ogTitle: `${data.value?.seo?.title || ''} — ${t('labels.print_version')}`,
        ogDescription: data.value?.seo?.description
    })


    onMounted(() => window.addEventListener('load', () => {
        window.print()
        window.onfocus = () => window.close()
    }))

</script>

<template>
    <template v-if="data">
        <OrganismsTerminalProfile :data print v-if="data.summary"/>

        <MoleculesHomeSectionHeader class="border-t border-default break-inside-avoid break-after-avoid" filename="experience.conf" echo="($DURATION)" v-if="data.experience?.length">
            ~/experience
            <template #detail>
                <span class="text-sm! text-default/50">({{ useExperience(
                    data.experience.at(-1)?.positions.at(-1)?.duration.from!,
                    data.experience.at(0)?.positions.at(0)?.duration.to
                ).duration() }})</span>
            </template>
        </MoleculesHomeSectionHeader>
        <OrganismsExperienceSection :data v-if="data.experience?.length"/>
    </template>
</template>
