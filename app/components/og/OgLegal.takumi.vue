<script setup lang="ts">
    import OgHeader from './OgHeader.takumi.vue'
    import type { OgTheme } from '~/lib/og'
    import { grid, swatches, themes } from '~/lib/og'

    const props = withDefaults(defineProps<{
        theme?: OgTheme
        site?: string
        id: string
        title: string
        description?: string
        author?: string
    }>(), { theme: 'dark' })

    const colors = themes[props.theme]
</script>

<template>
    <div class="flex size-full flex-col" :style="{ background: colors.bg, color: colors.text, fontFamily: `'Cascadia Mono'` }">
        <OgHeader :theme="props.theme" :site="props.site" :command="`\0d~/legal/ \0p$ \0ocat \0s${props.id}.md`"/>

        <div class="flex min-h-0 flex-1 flex-col justify-between p-8" :style="grid(colors)">
            <div class="flex flex-col gap-4 border p-8" :style="{ borderColor: colors.border, background: colors.bg }">
                <span class="text-5xl leading-tight font-bold"><span class="mr-4" :style="{ color: colors.comment }">#</span>{{ props.title }}</span>
                <span v-if="props.description" class="text-xl leading-normal" :style="{ color: colors.value }">{{ props.description }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xl" :style="{ color: colors.comment }">{{ props.author }}</span>
                <div class="flex">
                    <div v-for="color in swatches(colors)" :key="color" class="h-4 w-8" :style="{ background: color }"/>
                </div>
            </div>
        </div>
    </div>
</template>
