<script setup lang="ts">
    const props = defineProps<{
        project: Tile
        colors?: Record<string, string | undefined>
    }>()
    const emit = defineEmits<{ open: [id: string] }>()

    const color = computed<Record<string, string>>(() => ({
        '--logo-color-dark': props.colors?.[props.project.logo?.dark ?? props.project.logo?.light ?? ''] ?? 'var(--ui-text)',
        '--logo-color-light': props.colors?.[props.project.logo?.light ?? props.project.logo?.dark ?? ''] ?? 'var(--ui-text)',
    }))
</script>

<template>
    <article
        tabindex="0"
        role="link"
        :aria-label="props.project.name"
        class="group/tile relative flex flex-col min-w-0 bg-default outline-1 outline-solid outline-default transition-colors hover:z-10 hover:outline-primary focus-visible:z-10 focus-visible:outline-primary cursor-nw-resize! *:cursor-nw-resize!"
        @click="emit('open', props.project.id)"
        @keydown.enter="emit('open', props.project.id)"
    >
        <div class="relative grow min-h-0 overflow-clip max-lg:aspect-video flex items-center justify-center p-8">
            <div
                aria-hidden="true"
                :style="color"
                class="tile-lines bg-lines absolute inset-0 opacity-20 transition-opacity duration-300 group-hover/tile:opacity-50 group-focus-visible/tile:opacity-50"
            />
            <ProjectsDeck v-if="props.project.images?.length" :id="props.project.id" :images="props.project.images" :name="props.project.name" :bg="props.project.bg"/>
            <CommonImage
                skeleton="h-16 w-40"
                v-if="props.project.logo?.dark || props.project.logo?.light"
                :src="props.project.logo"
                alt=""
                loading="lazy"
                class="relative max-h-1/2 max-w-2/3 object-contain grayscale transition-all duration-300 group-hover/tile:grayscale-0 group-hover/tile:scale-110 group-focus-visible/tile:grayscale-0"
            />
        </div>
        <div class="flex flex-col border-t border-default bg-default px-6 py-4 transition-colors group-hover/tile:border-primary group-focus-visible/tile:border-primary">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm! font-bold truncate">{{ props.project.name }}</h3>
                <span aria-hidden="true" class="text-dimmed transition-colors group-hover/tile:text-primary group-focus-visible/tile:text-primary">↗</span>
            </div>
            <div class="grid grid-rows-open lg:grid-rows-closed lg:group-hover/tile:grid-rows-open lg:group-focus-visible/tile:grid-rows-open transition-all duration-300">
                <div class="min-h-0 overflow-hidden">
                    <div class="flex flex-col gap-3 pt-2">
                        <MDC :value="props.project.description ?? ''" class="md *:m-0! *:text-xs/4! text-dimmed"/>
                        <div class="flex flex-wrap gap-1">
                            <NuxtBadge v-for="tag in props.project.tags" :key="tag" variant="outline" color="neutral" size="sm">{{ tag }}</NuxtBadge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </article>
</template>
