<script setup lang="ts">
    import OgHeader from './OgHeader.takumi.vue'
    import type { OgTheme } from '~/lib/og'
    import { palette, themes } from '~/lib/og'

    const props = withDefaults(defineProps<{
        theme?: OgTheme
        site?: string
        id: string
        name: string
        description?: string
        thumbnail?: ThemedImage
        status?: string
        repo?: string
        tags?: string[]
    }>(), { theme: 'dark', tags: () => [] })

    const colors = themes[props.theme]
    const banner = props.thumbnail?.[props.theme] ?? props.thumbnail?.dark ?? props.thumbnail?.light
    const key = 'w-20 shrink-0'
</script>

<template>
    <div class="flex size-full flex-col" :style="{ background: colors.bg, color: colors.text, fontFamily: `'Cascadia Mono'` }">
        <OgHeader :theme="props.theme" :site="props.site" :command="`\0d~/projects/\0o${props.id} \0p$ \0ocat \0sreadme.md`"/>

        <img v-if="banner" :src="banner" width="1200" height="200" class="h-50 w-full shrink-0 object-cover border-b border-solid" :style="{ borderColor: colors.border }">

        <div class="flex min-h-0 flex-1">
            <div class="flex min-w-0 flex-1 flex-col justify-center gap-2 px-8">
                <span class="text-5xl leading-tight font-bold">{{ props.name }}</span>
                <span v-if="props.description" class="text-xl leading-normal" :style="{ color: colors.value }">{{ props.description }}</span>
            </div>

            <div class="flex w-115 shrink-0 flex-col justify-center px-8 text-xl leading-9 border-l border-solid" :style="{ borderColor: colors.border }">
                <div class="flex"><span :style="{ color: palette.primary }">[project]</span><span class="ml-3" :style="{ color: colors.comment }"># project.conf</span></div>
                <div v-if="props.status" class="flex"><span :class="key" :style="{ color: colors.dimmed }">status</span><span class="mr-3" :style="{ color: colors.border }">=</span><span :style="{ color: palette.primary }">"{{ props.status }}"</span></div>
                <div v-if="props.repo" class="flex"><span :class="key" :style="{ color: colors.dimmed }">repo</span><span class="mr-3" :style="{ color: colors.border }">=</span><span :style="{ color: colors.value }">{{ props.repo }}</span></div>
                <div v-if="props.tags.length" class="flex">
                    <span :class="key" :style="{ color: colors.dimmed }">tags</span><span class="mr-3" :style="{ color: colors.border }">=</span>
                    <span :style="{ color: colors.comment }">[</span><span :style="{ color: palette.success }">{{ props.tags.join(', ') }}</span><span :style="{ color: colors.comment }">]</span>
                </div>
            </div>
        </div>
    </div>
</template>
