<script setup lang="ts">
    import { plain } from '~/lib/markdown'
    import { useCmsStore } from '~/stores/cms'

    const route = useRoute()
    const theme = useColorMode()
    const config = useRuntimeConfig().public
    const cmsStore = useCmsStore()
    const id = computed<string>(() => route.params.id?.toString() ?? '')

    const { data } = await cmsStore.legal(id)

    if (!data.value) throw createError({ status: 404, message: `"${id.value}" Document not found` })

    defineOgImage('OgLegal.takumi', {
        theme: theme.value as 'dark' | 'light',
        site: config.site.url.replace(/^https?:\/\//, ''),
        id: id.value,
        title: data.value.title,
        description: plain(data.value.description),
        author: data.value.author,
    })

    useSeoMeta({
        title: () => data.value?.title,
        ogTitle: () => `${data.value?.author ?? ''} — ${data.value?.title}`,
        description: () => plain(data.value?.description),
        ogDescription: () => plain(data.value?.description),
    })
</script>

<template>
    <LayoutSection v-if="data" name="legal" :heading="data.title" :contact="false" class="border-t-0!">
        <div class="p-8 max-lg:p-4 flex flex-col gap-4">
            <p class="text-sm! text-default/50">{{ data.description }}</p>
            <MDC :value="data.content ?? ''" class="md *:mt-0!"/>
        </div>
    </LayoutSection>
</template>
