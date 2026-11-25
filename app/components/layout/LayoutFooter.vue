<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const config = useRuntimeConfig().public
    const cmsStore = useCmsStore()

    const key = 'relative col-start-1 text-dimmed after:absolute after:left-ch-9 after:text-line after:content-[\'=\']'
    const value = 'col-start-3 m-0 min-w-0 text-default/75'

    const { data } = await cmsStore.footer()

    const state = useState<{ logo: number }>('footer', () => ({ logo: Math.floor(Date.now() / 864e5) % 6 }))

    const notes = computed<string[]>(() => cmsStore.notes(data.value?.legal))
</script>

<template>
    <NuxtFooter :ui="{ container: 'lg:items-start!', right: 'lg:h-full! grow!', left: 'items-start! justify-start!s' }">
        <template #left>
            <div class="legal flex flex-col gap-3 text-xs/5 max-w-160 w-full">
                <CommonHighlight aria-hidden="true" :text="`\0p$ \0ocat \0slegal.conf`"/>
                <dl class="m-0 grid grid-cols-pair gap-y-0.5">
                    <dt :class="key">entity</dt><dd :class="value">{{ config.schema.organization.legalName }}</dd>
                    <dt :class="key">inn</dt><dd :class="value" class="tabular-nums">{{ config.schema.organization.inn }}</dd>
                    <dt :class="key">ogrnip</dt><dd :class="value" class="tabular-nums">{{ config.schema.organization.ogrn }}</dd>
                    <template v-if="data?.links?.length">
                        <dt :class="key">contacts</dt>
                        <dd :class="value">
                            <span class="text-dimmed">[</span><template v-for="(link, index) in data.links" :key="link.to"><NuxtLink :to="link.to" target="_blank" class="text-xs! text-default/75!">{{ link.label.toLowerCase() }}</NuxtLink><span v-if="index < data.links.length - 1" class="text-dimmed">, </span></template><span class="text-dimmed">]</span>
                        </dd>
                    </template>
                </dl>
                <div v-if="notes.length" class="flex flex-col gap-1">
                    <MDC v-for="note in notes" :key="note" :value="note" class="md md-notes"/>
                </div>
            </div>
        </template>
        <template #right>
            <div class="flex flex-col items-end h-full gap-2 max-lg:items-center">
                <button type="button" aria-label="xlsft" class="cursor-pointer" @click="state.logo = (state.logo + 1) % 6"><LayoutLogo :variant="state.logo as 0 | 1 | 2 | 3 | 4 | 5"/></button>
                <span class="text-xs text-comment"># {{ config.site.author }} @ {{ new Date().getFullYear() }}</span>
            </div>
        </template>
    </NuxtFooter>
</template>

