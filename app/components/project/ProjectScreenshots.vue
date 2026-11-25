<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        id: string
    }>()
    const cmsStore = useCmsStore()

    const { data } = await cmsStore.screenshots(() => props.id)

    const state = ref<{ index: number }>({ index: 0 })

    const pad = (value: number): string => String(value).padStart(2, '0')

    const gallery = computed<string[]>(() => (data.value?.images ?? []).filter(Boolean))

    watch(gallery, () => { state.value.index = 0 })
</script>

<template>
    <LayoutSection v-if="data && gallery.length" name="screenshots" :contact="false" :title="`\0d~/projects/${props.id} \0p$ \0ols \0sscreenshots/ \0c # ${pad(state.index)} / ${pad(gallery.length - 1)}`">
        <div :aria-label="data.name" class="bg-grid flex flex-col gap-3 p-8 max-sm:p-4">
            <GalleryPreview :id="props.id" v-model:index="state.index" :images="gallery" :label="data.name" class="relative">
                <NuxtImg
                    :src="gallery[state.index] ?? gallery[0]"
                    :alt="`${data.name} · ${state.index + 1} / ${gallery.length}`"
                    class="h-80 w-full border border-default bg-default object-contain sm:h-120"
                    :placeholder="Skeleton"
                />
            </GalleryPreview>
            <GalleryThumbnails v-model="state.index" :images="gallery" :label="data.name" class="relative"/>
        </div>
    </LayoutSection>
</template>

