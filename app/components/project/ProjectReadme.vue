<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        id: string
    }>()
    const { locale } = useI18n()
    const cmsStore = useCmsStore()

    const { data } = await cmsStore.readme(() => props.id)


    const tags = computed<string[]>(() => [...new Set([...data.value?.tags ?? []])])

    const pair = 'grid grid-cols-pair'
    const key = 'relative text-dimmed after:absolute after:left-ch-9 after:text-line after:content-["="]'
    const value = 'col-start-3 m-0 min-w-0 wrap-anywhere text-default/78'
    const host = (link: string): string => { try { return new URL(link).host.replace(/^www\./, '') } catch { return link } }
</script>

<template>
    <LayoutSection v-if="data" name="readme" :contact="false" :title="`\0d{/${locale}#projects}~/projects/\0o${data.id} \0p$ \0ocat \0sreadme.md`" class="border-t-0!">

        <div v-if="data.thumbnail?.dark || data.thumbnail?.light" class="bg-grid border-b border-default p-8 max-sm:p-4">
            <CommonImage :src="data.thumbnail" skeleton="w-full aspect-4/1" :alt="data.name" fetchpriority="high" class="relative w-full aspect-4/1 object-cover border border-default bg-default"/>
        </div>

        <div class="grid gap-px bg-border lg:grid-cols-2">
            <div class="flex min-w-0 flex-col justify-center gap-3 bg-default p-8 max-sm:p-4">
                <h1 class="leading-tight! max-sm:text-3xl!">{{ data.name }}</h1>
                <MDC v-if="data.description" :value="data.description" class="md max-w-prose *:my-0!"/>
            </div>

            <div class="flex min-w-0 flex-col justify-center gap-0.5 bg-default p-8 text-terminal/6.5 max-sm:text-compact/5.5 max-sm:p-4">
                <CommonHighlight :text="`\0p[project] \0c# project.conf`"/>
                <dl class="m-0">
                    <div v-if="data.status" :class="pair">
                        <dt :class="key">status</dt>
                        <dd :class="value" class="text-primary!">"{{ data.status }}"</dd>
                    </div>
                    <div v-if="data.repo" :class="pair">
                        <dt :class="key">repo</dt>
                        <dd :class="value">
                            <NuxtLink :to="`https://github.com/${data.repo}`" target="_blank" class="terminal-link">{{ data.repo }}</NuxtLink>
                        </dd>
                    </div>
                    <div v-if="data?.links?.length" :class="pair">
                        <dt :class="key">links</dt>
                        <dd :class="value">
                            <template v-for="(link, index) in data?.links" :key="link"><NuxtLink :to="link" target="_blank" class="terminal-link">{{ host(link) }}</NuxtLink><span v-if="index < (data?.links?.length ?? 0) - 1" class="text-comment">, </span></template>
                        </dd>
                    </div>
                    <div v-if="tags.length" :class="pair">
                        <dt :class="key">tags</dt>
                        <dd :class="value"><CommonHighlight :text="`\0c[${tags.map((tag) => `\0s${tag}`).join('\0c, ')}\0c]`"/></dd>
                    </div>
                    <div v-if="data?.stack" :class="pair">
                        <dt :class="key">stack</dt>
                        <dd :class="value">{{ data?.stack }} <a href="#stack" class="terminal-link ml-ch">[+] stack.tsv</a></dd>
                    </div>
                </dl>
            </div>
        </div>
    </LayoutSection>
</template>

