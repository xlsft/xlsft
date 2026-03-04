<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'

    const { t } = useI18n()
    const route = useRoute()

    const { data } = await useSanityDynamicQuery<any>(groq`*[_type == "project" && id == $id] {
        id, links, tags, repo,
        "name": name[$locale],
        "description": description[$locale],
        "thumbnail": thumbnail[$theme].asset->url,
        "logo": logo[$theme].asset->url,
        "images": images[].asset->url,
        "bg": bg.hex,
        "about": about[$locale],
        "stack": stack[]->{
            name, type, color, priority
        } | order(priority desc),
        "status": status[$locale],
        "copyright": copyright[$locale],
    }[0]`, ref({ id: route.params.id?.toString() }))

    const repo = data.value?.repo ? await useGithubRepository<any>(data.value?.repo) : undefined


</script>

<template>
    <NuxtCarousel
        v-if="data?.images?.length"
        :items="data.images" v-slot="{ item: src, index }"
        loop autoplay arrows
        :prev="{ variant: 'outline' }" :next="{ variant: 'outline' }"        
        :ui="{
            item: 'ps-0! basis-1/2 max-lg:basis-full relative overflow-hidden',
            prev: 'sm:start-8 rounded-none! hover:opacity-75! disabled:opacity-0! disabled:pointer-events-none!',
            next: 'sm:end-8 rounded-none! hover:opacity-75! disabled:opacity-0! disabled:pointer-events-none!',
            container: 'ms-0 max-h-100',
            root: 'border-b'
        }"
    >
        <AtomsPreview class="relative" :style="{ background: data?.bg }">
            <NuxtImg :src="(src as string)", :alt="data?.name + ` image ${index}`" class="transition-all select-none h-100 w-full object-contain object-center!" :placeholder="Skeleton" placeholder-class="animate-pulse blur-lg scale-150"/>
        </AtomsPreview>
    </NuxtCarousel>
    <MoleculesSectionHeader pattern="graph-paper">
        <div>{{ t('sections.about_project') }}</div>
    </MoleculesSectionHeader>
    <section class="p-8 max-lg:p-4 flex max-lg:flex-col-reverse gap-8 max-lg:gap-4">
        <div class="flex flex-col gap-4 grow">
            <NuxtImg :src="data?.thumbnail" :alt="data?.description" v-if="data?.thumbnail" class="w-full border"/>
            <div class="flex items-center gap-4">
                <h1>{{ data?.name }}</h1>
                <div class="flex items-center gap-1 *:text-yellow-500" v-if="repo?.stargazers_count">
                    <span>{{ repo?.stargazers_count }}</span>
                    <NuxtIcon name="mingcute:star-fill"/>
                </div>
            </div>
            <MDC :value="data?.about" class="md *:mt-0!"/>
            <p class="text-sm text-default/50" v-if="data?.copyright">{{ data?.copyright }}</p>
        </div>
        <div class="flex flex-col items-end max-lg:items-start gap-2 min-w-[30%]!">
            <NuxtBadge v-if="data?.status" :class="data?.images?.length ? `absolute top-8 right-8 max-lg:top-4 max-lg:right-4 z-2` : ''" variant="solid">{{ data?.status }}</NuxtBadge>
            <h3 class="text-lg!" v-if="data.description">{{ t('labels.about') }}:</h3>
            <MDC v-if="data.description" :value="data?.description" class="md *:m-0! *:text-sm! *:leading-4! text-default/50 *:text-right max-lg:*:text-left!"/>
            <h3 class="text-lg!" v-if="repo?.topics || data?.tags">{{ t('labels.tags') }}:</h3>
            <div class="flex flex-wrap gap-1 justify-end items-center" v-if="data?.tags">  
                <NuxtBadge v-for="tag in data?.tags" :key="tag" variant="outline" color="neutral">{{ tag }}</NuxtBadge>
            </div>
            <div class="flex flex-wrap gap-1 justify-end items-center" v-if="repo?.topics">  
                <NuxtBadge v-for="topic in repo?.topics" :key="topic" variant="outline" color="neutral">{{ topic }}</NuxtBadge>
            </div>
            <h3 class="text-lg!" v-if="data?.stack">{{ t('labels.stack') }}:</h3>
            <div id="stack" class="flex flex-wrap gap-1 justify-end items-center" v-if="data?.stack">  
                <NuxtBadge 
                    v-for="item in data?.stack" 
                    :key="item.name"
                    variant="outline" color="neutral"
                    :style="`--badge-color: ${item.color}`"
                    :ui="{ base: 'hover:bg-(--badge-color)/50 hover:ring-(--badge-color)!'}"
                >
                    {{ item.name }}
                </NuxtBadge>
            </div>
            <h3 class="text-lg!" v-if="data?.links">{{ t('labels.links') }}:</h3>
            <NuxtLink v-for="link in data.links" :key="link" :to="link" class="flex items-center gap-1" v-if="data?.links">
                {{ link }}
            </NuxtLink>
        </div>
    </section>
</template>