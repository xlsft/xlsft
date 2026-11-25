<script setup lang="ts">
    import * as locales from '@nuxt/ui/locale'
    import { useScroll } from '@vueuse/core'
    import Logo from '~/assets/svg/logo.svg?raw'
    import { useAssistantStore } from '~/stores/assistant'

    const { locale, setLocale, locales: i18nLocales, t } = useI18n()
    const assistantStore = useAssistantStore()
    const scroll = useScroll(document)
    const header = computed<number>(() => window ? parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--ui-header-height')) : 0)
</script>

<template>
    <NuxtHeader class="transition-colors duration-500" :ui="{ container: 'max-w-dvw', root: `${header >= scroll.y.value && 'border-bg!'} max-lg:border-default!` }">
        <template #left>
            <NuxtLink to="/" v-html="Logo" aria-label="xlsft" :prefetch="false"/>
        </template>
        <template #toggle>
            <NuxtButton variant="outline" color="neutral" icon="mingcute:download-2-line" class="max-w-8 justify-center" :aria-label="t('labels.download_cv')" :ui="{ leadingIcon: 'text-default!' }" @click="assistantStore.ask(t('ai.download_intent'))"></NuxtButton>
            <NuxtColorModeButton variant="subtle" :ui="{ base: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity' }"/>
            <NuxtLocaleSelect
                class="cursor-nw-resize! max-md:hidden"
                :model-value="locale"
                :locales="Object.values(locales).filter((nuxtLocale) => i18nLocales.find((i18nLocale) => i18nLocale.code === nuxtLocale.code))"
                @update:model-value="setLocale($event as 'ru')"
                :ui="{
                    base: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity',
                    item: '*:cursor-nw-resize! cursor-nw-resize! hover:opacity-75! transition-opacity',
                    itemTrailingIcon: 'scale-50'
                }"
            />
            <NuxtButton variant="outline" color="neutral" class="max-w-8 justify-center min-md:hidden" @click="setLocale(locale === 'en' ? 'ru' : 'en')">{{ locale === 'en' ? '🇷🇺' : '🇺🇸' }}</NuxtButton>
        </template>
    </NuxtHeader>
</template>
