<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'

    const { t } = useI18n()

    const { data } = await useSanityDynamicQuery<any>(groq`*[_type == "project"] {
        id, link, tags, repo,
        "name": name[$locale],
        "description": description[$locale],
        "logo": logo[$theme].asset->url,
        "images": images[].asset->url,
        "bg": bg.hex,
        "about": about[$locale],
        "stack": stack[]->{
            name, type, color, priority
        } | order(priority desc),
        "status": status[$locale]
    }[0]`)

    const repo = data.value.repo ? await useGithubRepository<any>(data.value.repo) : undefined

</script>

<template>
    <NuxtCarousel
        :items="data.images" v-slot="{ item: src }"
        loop autoplay arrows
        :prev="{ variant: 'outline' }" :next="{ variant: 'outline' }"        
        :ui="{
            item: 'ps-0! basis-1/2 relative overflow-hidden',
            prev: 'sm:start-8 rounded-none! hover:opacity-75! disabled:opacity-0! disabled:pointer-events-none!',
            next: 'sm:end-8 rounded-none! hover:opacity-75! disabled:opacity-0! disabled:pointer-events-none!',
            container: 'ms-0 max-h-100',
            root: 'border-b'
        }"
    >
        <div class="flex items-center justify-center overflow-hidden duration-700 relative w-full h-full" :style="{ background: data.bg }">
            <NuxtImg :src="(src as string)" class="transition-all select-none" :placeholder="Skeleton" placeholder-class="animate-pulse blur-lg scale-150"/>
        </div>
    </NuxtCarousel>
    <section class="p-8 max-lg:p-4 flex max-lg:flex-col-reverse gap-2 relative">
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-4">
                <h1>{{ data.name }}</h1>
                <div class="flex items-center gap-1 *:text-yellow-500" v-if="repo?.stargazers_count">
                    <span>{{ repo?.stargazers_count }}</span>
                    <NuxtIcon name="mingcute:star-line"/>
                </div>
            </div>
            <MDC :value="data.about" class="md"/>
        </div>
        <div class="flex flex-col items-end max-lg:items-start gap-2">
            <h3 class="text-lg!">{{ t('labels.about') }}:</h3>
            <MDC :value="data.description" class="md *:m-0! *:text-sm! *:leading-4! text-default/50 *:text-right max-lg:*:text-left!"/>
            <NuxtLink :to="data.link" class="flex items-center gap-1" v-if="repo?.stargazers_count">
                <span>{{ data.link }}</span>
                <NuxtIcon name="mingcute:link-2-line"/>
            </NuxtLink>
            <h3 class="text-lg!">{{ t('labels.tags') }}:</h3>
            <div class="flex flex-wrap gap-1" v-if="data.tags">  
                <NuxtBadge v-for="tag in data.tags" variant="outline" color="neutral">{{ tag }}</NuxtBadge>
            </div>
            <div class="flex flex-wrap gap-1" v-if="repo.topics">  
                <NuxtBadge v-for="topic in repo.topics" variant="outline" color="neutral">{{ topic }}</NuxtBadge>
            </div>
            <h3 class="text-lg!">{{ t('labels.stack') }}:</h3>
            <div class="flex flex-wrap gap-1" v-if="data.stack">  
                <NuxtBadge 
                    v-for="item in data.stack" 
                    variant="outline" color="neutral"
                    :style="`--badge-color: ${item.color}`"
                    :ui="{ base: 'hover:bg-(--badge-color)/50 hover:ring-(--badge-color)!'}"
                >
                    {{ item.name }}
                </NuxtBadge>
            </div>
        </div>
    </section>
</template>