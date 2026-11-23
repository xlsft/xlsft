<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'
    import useMarkdownRemoval from 'remove-markdown'

    const { t, locale } = useI18n()
    const route = useRoute()
    const router = useRouter()


    const params = ref({ id: route.params.id?.toString() }); watch(() => route.params.id, () => params.value.id = route.params.id?.toString())
    const { data } = await useClarityDynamicQuery<any>(groq`*[_type == "project" && id == $id] {
        "seo": *[_type == "summary"][0] {
            "title": title[$locale],
        },
        id, links, tags, repo,
        "name": name[$locale],
        "description": description[$locale],
        "thumbnail": { "dark": thumbnail.dark.asset->url, "light": thumbnail.light.asset->url },
        "images": images[].asset->url,
        "bg": bg.hex,
        "about": about[$locale],
        "stack": stack[]->{
            name, type, color, priority
        } | order(priority desc),
        "status": status[$locale],
        "copyright": copyright[$locale],
        "related": related[]->{
            id, tags, repo, priority,
            "name": name[$locale],
            "thumbnail": { "dark": thumbnail.dark.asset->url, "light": thumbnail.light.asset->url },
            "description": description[$locale]
        }
    }[0]`, params);

    if (!data.value) throw createError({ status: 404, message: `"${route.params.id?.toString()}" Project not found` })

    const gallery = computed<string[]>(() => (data.value?.images ?? []).filter(Boolean))
    const selectedImage = ref(0)
    watch(gallery, () => { selectedImage.value = 0 })

    const repo = data.value?.repo ? await useGithubRepository<any>(data.value?.repo) : undefined

    useSeoMeta({
        title: data.value?.name,
        ogTitle: `${data.value?.seo?.title || ''} — ${data.value?.name}`,
        description: useMarkdownRemoval(data.value?.description),
        ogDescription: useMarkdownRemoval(data.value?.description),
        ogImage: data.value.thumbnail?.dark || data.value.thumbnail?.light || undefined
    })

</script>

<template>
    <header class="p-8 max-lg:p-4 border-b">
        <div class="flex flex-wrap items-center gap-3">
            <h1>{{ data?.name }}</h1>
            <div v-if="repo?.stars" class="flex items-center gap-1 text-yellow-500">
                <span>{{ repo.stars }}</span>
                <NuxtIcon name="mingcute:star-fill"/>
            </div>
        </div>
        <MDC v-if="data?.description" :value="data.description" class="md max-w-prose text-muted"/>
    </header>

    <section class="grid gap-8 p-8 max-lg:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)]">
        <aside class="flex min-w-0 flex-col items-start gap-3 break-words">
            <NuxtBadge v-if="data?.status" variant="solid">{{ data.status }}</NuxtBadge>
            <h3 class="text-lg!" v-if="repo?.topics?.length || data?.tags?.length">{{ t('labels.tags') }}:</h3>
            <div class="flex flex-wrap gap-1 items-center" v-if="data?.tags">
                <NuxtBadge v-for="tag in data?.tags" :key="tag" variant="outline" color="neutral">{{ tag }}</NuxtBadge>
            </div>
            <div class="flex flex-wrap gap-1 items-center" v-if="repo?.topics">
                <NuxtBadge v-for="topic in repo?.topics" :key="topic" variant="outline" color="neutral">{{ topic }}</NuxtBadge>
            </div>

            <h3 class="text-lg!" v-if="data?.stack?.length">{{ t('labels.stack') }}:</h3>
            <div id="stack" class="flex flex-wrap gap-1 items-center" v-if="data?.stack?.length">
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

            <h3 class="text-lg!" v-if="data?.links?.length">{{ t('labels.links') }}:</h3>
            <NuxtLink v-for="link in data?.links" :key="link" :to="link" class="flex items-center gap-1" v-if="data?.links?.length">
                {{ link }}
            </NuxtLink>
            <AtomsThemedImage v-if="data?.thumbnail?.dark || data?.thumbnail?.light" :src="data.thumbnail" :alt="data.name" class="w-full border"/>
        </aside>

        <article class="min-w-0 space-y-6">
            <div v-if="data?.about">
                <h2>{{ t('sections.about_project') }}</h2>
                <MDC :value="data.about" class="md max-w-prose overflow-x-auto"/>
            </div>
            <p v-if="data?.copyright" class="text-sm text-muted">{{ data.copyright }}</p>

            <section v-if="gallery.length" :aria-label="data.name">
                <AtomsPreview v-model:index="selectedImage" :images="gallery" :label="data.name" :id="data.id">
                    <NuxtImg
                        :src="gallery[selectedImage] ?? gallery[0]"
                        :alt="`${data.name} · ${selectedImage + 1} / ${gallery.length}`"
                        class="h-80 w-full object-contain sm:h-100"
                        :placeholder="Skeleton"
                    />
                </AtomsPreview>
                <MoleculesImageThumbnails v-model="selectedImage" :images="gallery" :label="data.name" class="mt-3"/>
            </section>
        </article>
    </section>
    <template v-if="data.related?.length">
        <MoleculesSectionHeader pattern="graph-paper" id="projects">
            <div>{{ t('sections.related_projects') }}</div>
        </MoleculesSectionHeader>
        <section class="flex flex-col relative">
            <NuxtBlogPosts class="p-8 max-lg:p-4" :ui="{ base: 'gap-4! p-8!' }">
                <NuxtBlogPost
                    v-for="project in [...data.related].sort((a: any, b: any) => b.priority - a.priority)"
                    :key="project.id"
                    :title="project.name"
                    variant="outline"
                    :image="project.thumbnail?.dark || project.thumbnail?.light || undefined"
                    @click="() => { router.push(`/${locale}/projects/${project.id}`) }"
                    :ui="{
                        header: 'border-b group-hover/blog-post:border-primary!',
                        image: 'grayscale group-hover/blog-post:grayscale-0 group-hover/blog-post:scale-105! transition-all',
                        root: 'hover:ring-primary! *:cursor-nw-resize! cursor-nw-resize!',
                        body: 'p-3! flex flex-col gap-1',
                        description: 'm-0! flex flex-col gap-4 grow',
                        title: 'text-sm!'
                    }"
                >
                    <template #header="{ ui }" v-if="project.thumbnail?.dark || project.thumbnail?.light">
                        <AtomsThemedImage :src="project.thumbnail" :alt="project.name" :class="ui.image({ class: 'grayscale group-hover/blog-post:grayscale-0 group-hover/blog-post:scale-105! transition-all' })"/>
                    </template>
                    <template #title>
                        <div class="flex items-center justify-between w-full gap-2">
                            <span>{{ project.name }}</span>
                        </div>
                    </template>
                    <template #description>
                        <MDC :value="project.description" class="md *:m-0! *:text-xs! *:leading-4! grow"/>
                        <div class="flex flex-wrap gap-1">
                            <NuxtBadge v-for="tag in project.tags" :key="tag" variant="outline" color="neutral" size="sm">{{ tag }}</NuxtBadge>
                        </div>
                    </template>
                </NuxtBlogPost>
            </NuxtBlogPosts>
        </section>
    </template>
</template>
