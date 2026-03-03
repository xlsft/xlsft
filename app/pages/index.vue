<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'
    
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
            "footer": footer[$locale],
        } | order(positions[0].duration.from desc),
    }`)

    const experience = (_from: string | Date, _to: string | Date) => {
        const from = new Date(_from), to = _to ? new Date(_to) : new Date()
        const total = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
        const years = Math.floor(total / 12), months = total % 12

        const data = { total, from, to, now: !_to, months, years }
        return {
            duration() {  
                return (data.years > 0 ? useNumberCase(data.years, t('years.one'), t('years.two'), t('years.more')) + ' ' : '') + 
                useNumberCase(data.months, t('months.one'), t('months.two'), t('months.more')) 
            },
            period() {
                const formatter = new Intl.DateTimeFormat(locale.value, { month: 'long' })
                return `${formatter.format(data.from)} ${data.from.getFullYear()} — ${data.now ? t('present') : `${formatter.format(data.to)} ${data.to.getFullYear()}`} / ${this.duration()}`
            }
        }
    } 
</script>

<template>
    <template v-if="data">
        <section class="p-8 max-lg:p-4 flex max-lg:flex-col-reverse gap-4 relative" v-if="data.summary">
            <div class="flex gap-2 flex-col absolute max-lg:static right-8 bottom-8 *:text-right max-lg:*:text-left">
                <NuxtLink v-if="data.links.github?.to" :to="data.links.github.to" target="_blank">{{ data.links.github.label }}</NuxtLink>
                <NuxtLink v-if="data.links.hh?.to" :to="data.links.hh.to" target="_blank">{{ data.links.hh.label }}</NuxtLink>
                <NuxtLink v-if="data.links.linkedin?.to" :to="data.links.linkedin.to" target="_blank">{{ data.links.linkedin.label }}</NuxtLink>
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
                        <span class="text-default/50 text-xs w-full">{{ key }}</span>
                        <AtomsBadge v-if="data.skills" v-for="skill in items" :color="skill.color" >{{ skill.name }}</AtomsBadge>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-center h-fit w-100 min-lg:min-w-100 max-sm:w-full max-lg:w-70 overflow-hidden duration-700 relative">
                <NuxtBadge class="absolute top-2 right-2" variant="solid">{{ data.summary.status }}</NuxtBadge>
                <NuxtImg 
                    :src="data.summary.image" 
                    class="h-fit w-100 min-lg:min-w-100 max-sm:w-full max-lg:w-70 transition-all" 
                    :placeholder="Skeleton" 
                    placeholder-class="animate-pulse blur-lg scale-110"
                />
            </div>
        </section>
        <template v-if="data.experience?.length">
            <MoleculesSectionHeader pattern="architect">
                {{ t('sections.experience') }}<br>
                <span class="text-sm! text-default/50">({{ experience(
                    data.experience.at(-1)?.positions.at(-1)?.duration.from, 
                    data.experience.at(0)?.positions.at(0)?.duration.to
                ).duration() }})</span>
            </MoleculesSectionHeader>
            <section class="p-8 max-lg:p-4 flex flex-col relative">
                <div class="flex flex-col gap-8 relative pl-20 pb-6 last:pb-0 max-lg:pl-0!" v-for="company, i in data.experience">
                    <div class="h-full w-px bg-border absolute top-0 left-6 max-lg:hidden" v-if="data.experience.length !== Number(i) + 1"></div>
                    <AtomsPattern name="texture" class="w-12 h-12 border absolute! top-0 left-0 bg-default z-2 flex items-center justify-center text-default/50 text-sm! max-lg:hidden">{{ (data.experience.length - Number(i) - 1).toString().padStart(2, '0') }}</AtomsPattern>

                    <div class="flex flex-col gap-4 grow">
                        <NuxtImg v-if="company.logo" :src="company.logo" class="h-12 max-lg:h-6 w-fit flex items-center text-2xl font-bold" loading="lazy" :alt="company.name"/>
                        <span v-else class="h-12 w-fit flex items-center text-2xl font-bold">{{ company.name }}</span>

                        <MDC v-if="company.about" :value="company.about" class="*:my-0! *:leading-4 *:text-xs! *:text-default/50"/>

                        <div class="flex flex-col items-end gap-2 *:leading-4 *:text-sm! *:text-nowrap absolute top-0 right-0 max-lg:static max-lg:items-start">
                            <span v-if="company.positions.length > 1">{{ t('labels.total_positions_duration') }}: {{ experience(
                                company.positions.at(-1)?.duration.from, 
                                company.positions.at(0)?.duration.to
                            ).duration() }}</span>
                            <NuxtLink v-if="company.link" :to="company.link" class="text-default/50">{{ company.link }}</NuxtLink>
                        </div>

                        <div class="flex flex-col relative gap-2" v-for="position in company.positions">
                            <div class="w-10 h-px bg-border absolute top-3 -left-14" v-if="company.positions.length > 1"></div>
                            <span class="text-lg font-bold">{{ position.name }} <span class="text-default/50">/ {{ experience(position.duration.from, position.duration.to).period() }}</span></span>
                            
                            <div class="flex flex-wrap gap-1">
                                <AtomsBadge v-for="skill in position.skills" :color="skill.color">{{ skill.name }}</AtomsBadge>
                            </div>

                            <span class="text-lg font-bold text-default/50">{{ t('labels.position_description') }}</span>
                            
                            <MDC v-if="position.description" :value="position.description" class="md *:my-0!"/>
                        </div>

                        <MDC v-if="company.footer" :value="company.footer" class="md *:my-0! *:text-sm *:text-default/50"/>
                    
                    </div>
                </div>
            </section>
        </template>
        <MoleculesSectionHeader pattern="graph-paper">
            <div>{{ t('sections.projects') }}</div>
        </MoleculesSectionHeader>
        <section class="p-8 max-lg:p-4 flex max-lg:flex-col-reverse gap-4 relative">
            <NuxtBlogPosts>
                <NuxtBlogPost
                    title="Introducing Nuxt Icon v1"
                    description="Discover Nuxt Icon v1 - a modern, versatile, and customizable icon solution for your Nuxt projects."
                    image="https://nuxt.com/assets/blog/nuxt-icon/cover.png"
                    date="2024-11-25"
                    to="https://nuxt.com/blog/nuxt-icon-v1-0"
                    target="_blank"
                />
            </NuxtBlogPosts>
        </section>
    </template>
</template>
