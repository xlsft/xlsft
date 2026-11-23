<script setup lang="ts">
    // Плитка проекта: одна и та же на главной и в блоке проектов в чате ассистента.
    // Классы позиционирования (сетка, высота) приходят снаружи через class/style.
    type Tile = {
        id: string, name: string, description?: string, tags?: string[], bg?: string,
        logo?: { dark?: string | null, light?: string | null } | null, images?: string[]
    }
    const props = defineProps<{ project: Tile, logoColors?: Record<string, string | null> | null }>()
    const emit = defineEmits<{ open: [id: string] }>()
</script>

<template>
    <article
        tabindex="0"
        role="link"
        :aria-label="project.name"
        class="group/tile relative flex flex-col min-w-0 bg-default outline-1 outline-solid outline-(--ui-border) transition-colors hover:z-10 hover:outline-primary focus-visible:z-10 focus-visible:outline-primary cursor-nw-resize! *:cursor-nw-resize!"
        @click="emit('open', project.id)"
        @keydown.enter="emit('open', project.id)"
    >
        <!-- фон плитки рисуется классами: ровная сетка, при наведении — цвета логотипа; поверх — прозрачный логотип из поля logo -->
        <div class="relative grow min-h-0 overflow-clip max-lg:aspect-video flex items-center justify-center p-8">
            <div
                aria-hidden="true"
                :style="{
                    '--logo-color-dark': logoColors?.[project.logo?.dark || project.logo?.light || ''] || 'var(--ui-text)',
                    '--logo-color-light': logoColors?.[project.logo?.light || project.logo?.dark || ''] || 'var(--ui-text)'
                }"
                class="[--logo-color:var(--logo-color-light)] dark:[--logo-color:var(--logo-color-dark)] absolute inset-0 opacity-20 transition-opacity duration-300 [--grid-line:var(--ui-border)] group-hover/tile:[--grid-line:var(--logo-color)] group-focus-visible/tile:[--grid-line:var(--logo-color)] group-hover/tile:opacity-50 group-focus-visible/tile:opacity-50 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-size-[24px_24px] bg-center"
            />
            <MoleculesScreenshotsDeck v-if="project.images?.length" :images="project.images" :name="project.name" :id="project.id" :bg="project.bg"/>
            <AtomsThemedImage
                v-if="project.logo?.dark || project.logo?.light"
                :src="project.logo"
                alt=""
                loading="lazy"
                class="relative max-h-[55%] max-w-[70%] object-contain grayscale transition-all duration-300 group-hover/tile:grayscale-0 group-hover/tile:scale-110 group-focus-visible/tile:grayscale-0"
            />
        </div>
        <div class="flex flex-col border-t border-default bg-default px-6 py-4 transition-colors group-hover/tile:border-primary group-focus-visible/tile:border-primary">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm! font-bold truncate">{{ project.name }}</h3>
                <span aria-hidden="true" class="text-dimmed transition-colors group-hover/tile:text-primary group-focus-visible/tile:text-primary">↗</span>
            </div>
            <div class="grid grid-rows-[1fr] lg:grid-rows-[0fr] lg:group-hover/tile:grid-rows-[1fr] lg:group-focus-visible/tile:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
                <div class="min-h-0 overflow-hidden">
                    <div class="flex flex-col gap-3 pt-2">
                        <MDC :value="project.description" class="md *:m-0! *:text-xs! *:leading-4! text-dimmed"/>
                        <div class="flex flex-wrap gap-1">
                            <NuxtBadge v-for="tag in project.tags" :key="tag" variant="outline" color="neutral" size="sm">{{ tag }}</NuxtBadge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </article>
</template>
