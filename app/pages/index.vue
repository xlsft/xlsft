<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const { t } = useI18n()
    const theme = useColorMode()
    const config = useRuntimeConfig().public
    const cmsStore = useCmsStore()

    const { data } = await cmsStore.profile()

    if (data.value) {
        const info = cmsStore.fetch(data.value)
        defineOgImage('OgIndex.takumi', {
            theme: theme.value as 'dark' | 'light',
            site: config.site.url.replace(/^https?:\/\//, ''),
            contact: t('labels.contact_me'),
            photo: data.value.summary.image,
            rows: [
                { key: t('profile.user'), value: info.user },
                { key: t('profile.role'), value: info.role },
                { key: t('profile.host'), value: info.host },
                { key: t('profile.uptime'), value: info.uptime },
                { key: t('profile.status'), value: data.value.summary.status },
            ].filter((row): row is { key: string, value: string } => !!row.value),
        })
    }

    useSeoMeta({
        title: t('pages.index'),
        ogTitle: () => `${data.value?.summary.title ?? ''} — ${t('pages.index')}`,
        description: () => data.value?.summary.description ?? '',
        ogDescription: () => data.value?.summary.description ?? '',
    })
</script>

<template>
    <Profile/>
    <Experience collapsible/>
    <Projects/>
</template>
