<script setup lang="ts">
    import * as locales from '@nuxt/ui/locale'

    const { locale, setLocale, locales: i18nLocales } = useI18n()
</script>

<template>
    <NuxtLocaleSelect
        class="cursor-nw-resize!"
        :model-value="locale"
        :locales="Object.values(locales).filter((nuxtLocale) => i18nLocales.find((i18nLocale) => i18nLocale.code === nuxtLocale.code))"
        @update:model-value="setLocale($event as 'ru')"
        :ui="{
            item: 'cursor-nw-resize! *:cursor-nw-resize! hover:opacity-75! transition-opacity',
            itemTrailingIcon: 'scale-50'
        }"
    />
</template>
