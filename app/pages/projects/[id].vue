<script setup lang="ts">
    import useMarkdownRemoval from 'remove-markdown'
    import { useCmsStore } from '~/stores/cms'

    const route = useRoute()
    const theme = useColorMode()
    const config = useRuntimeConfig().public
    const cmsStore = useCmsStore()
    const id = computed<string>(() => route.params.id?.toString() ?? '')

    const { data } = await cmsStore.project(id)

    if (!data.value) throw createError({ status: 404, message: `"${id.value}" Project not found` })

    defineOgImage('OgProject.takumi', {
        theme: theme.value as 'dark' | 'light',
        site: config.site.url.replace(/^https?:\/\//, ''),
        id: id.value,
        name: data.value.name,
        description: useMarkdownRemoval(data.value.description ?? ''),
        thumbnail: data.value.thumbnail?.[theme.value as 'dark' | 'light'] ?? data.value.thumbnail?.dark ?? data.value.thumbnail?.light,
        status: data.value.status,
        repo: data.value.repo,
        tags: [...new Set(data.value.tags ?? [])],
    })

    useSeoMeta({
        title: () => data.value?.name,
        ogTitle: () => `${data.value?.author ?? ''} — ${data.value?.name}`,
        description: () => useMarkdownRemoval(data.value?.description ?? ''),
        ogDescription: () => useMarkdownRemoval(data.value?.description ?? ''),
    })
</script>

<template>
    <ProjectReadme :id/>
    <ProjectAbout :id/>
    <ProjectScreenshots :id/>
    <Projects :exclude="id"/>
</template>
