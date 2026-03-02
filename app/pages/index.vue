<script setup lang="ts">
    const { t, locale } = useI18n()

    const { data } = await useSanityLocaleQuery(groq`{
        "summary": *[_type == "summary"][0]{ 
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
            "logo": logo.asset->url,
            "about": about[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": description[$locale],
                "skills": skills[]->{
                    name, type, color, priority
                },
                duration,
            } | order(duration.from desc),
        } | order(positions[0].duration.from desc)
    }`)

    const total = computed(() => {
        const from = new Date(data.value.experience.at(-1)?.positions.at(-1)?.duration.from)
        const to = new Date(data.value.experience.at(0)?.positions.at(0)?.duration.to || new Date())
        // return `${years} ${dayjs().relativeTime(years, true, "y")} ${months} ${dayjs().relativeTime(months, true, "M")}`
    })
        
</script>

<template>
    <template v-if="data">
        <section class="border-b p-8 flex max-lg:flex-col-reverse gap-4 relative" >
            <div class="flex gap-2 flex-col absolute max-lg:static right-8 bottom-8 *:text-right max-lg:*:text-left">
                <NuxtLink :to="data.links.github.to" target="_blank">{{ data.links.github.label }}</NuxtLink>
                <NuxtLink :to="data.links.hh.to" target="_blank">{{ data.links.hh.label }}</NuxtLink>
                <NuxtLink :to="data.links.linkedin.to" target="_blank">{{ data.links.linkedin.label }}</NuxtLink>
            </div>
            
            <div class="grow flex flex-col gap-4">
                <MDC :value="data.summary.content" class="md"/>
                <div class="flex flex-col gap-1">
                    <div 
                        v-for="items, key in Object.fromEntries(data.skills.map((group: any) => [
                            group.type, 
                            group.items.sort((a: any, b: any) => b.priority - a.priority)
                        ]))"
                        class="flex flex-wrap gap-1 items-center" 
                        :style="`order: -${items.map((v: any) => v.name).join('').length}`" >
                        <span class="text-muted text-xs w-full">{{ key }}</span>
                        <AtomsBadge v-if="data.skills" v-for="skill in items" :color="skill.color" >{{ skill.name }}</AtomsBadge>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-center h-100 w-100 min-w-100 min-h-100 max-lg:h-70 max-lg:w-70 max-lg:min-w-70 max-lg:min-h-70 overflow-hidden duration-700 relative">
                <NuxtBadge class="absolute top-2 right-2" variant="solid">{{ data.summary.status }}</NuxtBadge>
                <NuxtImg 
                    :src="data.summary.image" 
                    class="h-100 w-100 min-w-100 min-h-100 max-lg:h-70 max-lg:w-70 max-lg:min-w-70 max-lg:min-h-70 transition-all" 
                    placeholder="/skeleton.svg" 
                    placeholder-class="animate-pulse blur-lg scale-110"
                />
            </div>
        </section>
        <MoleculesSectionHeader pattern="architect">
            {{ t('sections.experience') }}<br>
            <span class="text-lg! text-default/50">{{ total }}</span>
        </MoleculesSectionHeader>
        <section class="p-8 flex max-lg:flex-col-reverse gap-4 relative">
            {{ data.experience }}
        </section>
    </template>
</template>

<i18n>
    {
        "ru": {
            "sections": {
                "experience": "Коммерческий опыт"
            }
        },
        "en": {
            "sections": {
                "experience": "Experience"
            }
        },
    }
</i18n>

