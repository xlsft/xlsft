<script setup lang="ts">
    import type { OgTheme } from '~/lib/og'
    import Logo from '~/assets/svg/logo.svg?raw'
    import { palette, themes, tokens } from '~/lib/og'

    // slots become display: contents islands that takumi cannot render, so templates compose the header instead of wrapping in it
    const props = withDefaults(defineProps<{
        theme?: OgTheme
        command: string
        site?: string
    }>(), { theme: 'dark' })

    const colors = themes[props.theme]
    const logo = `data:image/svg+xml;base64,${btoa(Logo.replace('var(--ui-primary)', palette.primary).replace('var(--ui-text)', colors.text))}`
</script>

<template>
    <div class="flex shrink-0 flex-col">
        <div class="flex h-16 items-center justify-between px-8 border-b border-solid" :style="{ borderColor: colors.border }">
            <img :src="logo" width="182" height="24" class="h-6 w-45.5">
            <span v-if="props.site" class="text-xl" :style="{ color: colors.dimmed }">{{ props.site }}</span>
        </div>
        <div class="flex h-21 items-center px-8 border-b border-solid" :style="{ borderColor: colors.border }">
            <div class="flex text-2xl whitespace-pre">
                <span v-for="(token, index) in tokens(props.command, colors)" :key="index" :style="{ color: token.color }">{{ token.text }}</span>
            </div>
        </div>
    </div>
</template>
