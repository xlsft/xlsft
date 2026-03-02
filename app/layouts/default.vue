<script setup lang="ts">
    import { useScroll } from '@vueuse/core';   
    import * as locales from '@nuxt/ui/locale'

    const { locale, setLocale, locales: i18nLocales } = useI18n()
    const scroll = useScroll(document)
    const header = computed(() => window ? parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--ui-header-height')) : 0)
</script>

<template>
    <NuxtHeader class="transition-colors duration-500" :ui="{ container: 'max-w-dvw', root: `${header >= scroll.y.value && 'border-bg!'} max-lg:border-default!` }">
        <template #left>
            <AtomsLogo/>
        </template>
        <template #toggle>
            <NuxtColorModeButton variant="subtle" :ui="{ base: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity' }"/>
            <NuxtLocaleSelect
                class="cursor-nw-resize!"
                :model-value="locale"
                :locales="Object.values(locales).filter((nuxtLocale) => i18nLocales.find((i18nLocale) => i18nLocale.code === nuxtLocale.code))"
                @update:model-value="setLocale($event as 'ru')"
                :ui="{
                    base: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity',
                    item: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity',
                    itemTrailingIcon: 'scale-50'
                }"
            />
        </template>
    </NuxtHeader>
    <NuxtContainer class="flex flex-col min-h-(--ui-viewport-height) py-12 max-lg:p-0!">
        <div class="min-w-full min-h-full grow border max-lg:border-none relative flex flex-col">
            <AtomsCross class="absolute top-0 left-0 opacity-50 max-lg:hidden"/>
            <MoleculesSectionHeader pattern="lines-in-motion" class="max-lg:hidden"/>
            <div class="w-full h-full grow flex flex-col overflow-x-hidden">
                <slot/>
            </div>
        </div>
    </NuxtContainer>
</template>
