<script setup lang="ts">
    import OgHeader from './OgHeader.takumi.vue'
    import type { OgRow, OgTheme } from '~/lib/og'
    import { grid, palette, rows, swatches, themes } from '~/lib/og'

    const props = withDefaults(defineProps<{
        theme?: OgTheme
        site?: string
        photo?: string
        lines?: OgRow[]
    }>(), { theme: 'dark', lines: () => [] })

    const colors = themes[props.theme]
</script>

<template>
    <div class="flex size-full flex-col" :style="{ background: colors.bg, color: colors.text, fontFamily: `'Cascadia Mono'` }">
        <OgHeader :theme="props.theme" :site="props.site" :command="`\0d~/ \0p$ \0ofastfetch\0d && \0ocat \0sreadme.md`"/>

        <div class="flex min-h-0 flex-1">
            <div v-if="props.photo" class="flex w-110 shrink-0 items-center justify-center border-r border-solid" :style="{ borderColor: colors.border, ...grid(colors) }">
                <img :src="props.photo" width="320" height="320" class="size-80 border object-cover" :style="{ borderColor: colors.border }">
            </div>

            <div class="flex flex-1 flex-col justify-center gap-6 px-12">
                <div class="relative flex flex-col border px-7 pt-6 pb-4" :style="{ borderColor: colors.border }">
                    <div class="absolute -top-4 left-5 flex px-2.5 text-2xl leading-8 font-bold" :style="{ background: colors.bg }">
                        <span :style="{ color: palette.primary }">root</span><span>@</span><span :style="{ color: palette.primary }">xlsft</span>
                    </div>
                    <div v-for="(row, index) in props.lines" :key="row.key" class="flex text-2xl leading-10">
                        <span class="w-30 shrink-0 lowercase" :style="{ color: rows[index % rows.length] }">{{ row.key }}</span>
                        <span :style="{ color: index === 0 ? colors.text : colors.value }">{{ row.value }}</span>
                    </div>
                </div>
                <div class="flex">
                    <div v-for="color in swatches(colors)" :key="color" class="h-4 w-8" :style="{ background: color }"/>
                </div>
            </div>
        </div>
    </div>
</template>
