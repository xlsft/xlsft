<script setup lang="ts">
    import { usePreferredReducedMotion } from '@vueuse/core'
    import { useCmsStore } from '~/stores/cms'


    const { t } = useI18n()
    const config = useRuntimeConfig().public
    const motion = usePreferredReducedMotion()
    const cmsStore = useCmsStore()

    const prompt = { user: 'root', host: 'xlsft' }

    const tail = [
        { text: ' |', color: 'd' },
        { text: ' tail ', color: 'o' },
        { text: '-n', color: 'i' },
        { text: ' 0', color: 'w' },
    ]
    const length = tail.reduce((total, token) => total + token.text.length, 0)

    const row = 'col-span-full grid grid-cols-subgrid items-center'
    const icon = 'size-4.5 max-sm:size-3.75'
    const value = 'm-0 wrap-anywhere text-default/78'

    const palette = ['bg-border', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-inverted']

    const { data } = await cmsStore.profile()

    const state = ref<{ stack?: boolean, typed: number }>({ typed: length })

    const methods = {
        command(): string {
            let remaining = state.value.typed
            return tail.map(({ text, color }) => {
                const visible = text.slice(0, Math.max(0, remaining))
                remaining -= text.length
                return `\0${color}${visible}`
            }).join('')
        },
        bare: (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
        type(target: number, onCleanup: (cleanup: () => void) => void): void {
            if (motion.value === 'reduce' || state.value.typed === target) {
                state.value.typed = target
                return
            }
            const step = Math.sign(target - state.value.typed)
            const timer = window.setInterval(() => {
                state.value.typed += step
                if (state.value.typed === target) window.clearInterval(timer)
            }, 28)
            onCleanup(() => window.clearInterval(timer))
        },
    }

    const bio = computed<{ heading?: string, body?: string }>(() => {
        const content = data.value?.summary.content?.trim() ?? ''
        const heading = /^# +([^\n]+)(?:\n|$)/.exec(content)
        const body = content.slice(heading?.[0].length ?? 0).trim()
        return { heading: heading?.[1]?.trim() ?? data.value?.summary.title, body: body.length ? body : data.value?.summary.description }
    })

    const info = computed<ReturnType<typeof cmsStore.fetch>>(() => cmsStore.fetch(data.value))

    const groups = computed<{ type: string, items: Skill[] }[]>(() => cmsStore.group(data.value?.skills)
        .map((group) => ({ type: group.type, items: [...group.items].sort((a, b) => b.priority - a.priority) }))
        .sort((a, b) => b.items.length - a.items.length))
    const packages = computed<number>(() => groups.value.reduce((total, group) => total + group.items.length, 0))
    const shell = computed<string | undefined>(() => groups.value.find((group) => group.type === 'frontend')?.items.slice(0, 3).map((skill) => skill.name).join(', '))
    const links = computed<{ label: string, to: string }[]>(() => Object.values(data.value?.links ?? {}).filter((link) => !!link?.to))

    watch([() => state.value.stack, motion], ([open], _, onCleanup) => methods.type(open ? 0 : length, onCleanup))
</script>

<template>
    <LayoutSection
        v-if="data?.summary"
        name="profile"
        aria-labelledby="profile-name"
        class="text-terminal/6.5 max-sm:text-compact/5.5 print:print-exact"
        :title="`\0d~/ \0p$ \0ofastfetch\0d && \0ocat \0sreadme.md${groups.length ? `\0d && \0obat \0sstack.tsv${methods.command()}` : ''}`"
    >
        <div class="grid" :class="data.summary.image && 'grid-cols-photo max-sm:block'">
            <div v-if="data.summary.image" class="bg-grid flex min-w-0 items-center justify-center self-stretch p-8 max-sm:border-b max-sm:border-default max-sm:p-0">
                <NuxtImg :src="data.summary.image" :alt="data.summary.title" width="576" height="576" fetchpriority="high" class="relative aspect-square w-full border border-default object-cover max-sm:border-0"/>
            </div>

            <div class="flex min-w-0 flex-col justify-center gap-5 px-10 py-8 max-sm:gap-4 max-sm:p-4" :class="data.summary.image && 'border-l border-default max-sm:border-l-0'">
                <div class="relative mt-3.25 min-w-0 shrink-0 border border-default px-6 pt-5.75 pb-4 max-sm:mt-2.75 max-sm:px-3.5 max-sm:pt-4.25 max-sm:pb-3">
                    <CommonHighlight class="absolute top-0 left-4 -translate-y-1/2 bg-default px-2 font-bold leading-6.5 max-sm:left-1.5 max-sm:leading-5.5" :text="`\0p${prompt.user}\0o@\0p${prompt.host}`"/>
                    <dl class="fetch-rows m-0 grid grid-cols-fetch gap-x-3.5 max-sm:grid-cols-fetch-sm max-sm:gap-x-2">
                        <div v-if="info.user" :class="row"><NuxtIcon name="mingcute:user-3-line" :class="icon"/><dt class="lowercase">{{ t('profile.user') }}</dt><dd :class="value" class="text-default!">{{ info.user }}</dd></div>
                        <div :class="row"><NuxtIcon name="mingcute:briefcase-line" :class="icon"/><dt class="lowercase">{{ t('profile.role') }}</dt><dd :class="value">{{ info.role }}</dd></div>
                        <div v-if="info.host" :class="row"><NuxtIcon name="mingcute:server-line" :class="icon"/><dt class="lowercase">{{ t('profile.host') }}</dt><dd :class="value">{{ info.host }}</dd></div>
                        <div v-if="info.uptime" :class="row"><NuxtIcon name="mingcute:time-line" :class="icon"/><dt class="lowercase">{{ t('profile.uptime') }}</dt><dd :class="value">{{ info.uptime }}</dd></div>
                        <div v-if="packages" :class="row">
                            <NuxtIcon name="mingcute:package-2-line" :class="icon"/><dt class="lowercase">{{ t('profile.packages') }}</dt>
                            <dd :class="value">
                                {{ packages }}
                                <button type="button" class="terminal-link ml-ch print:hidden" :aria-expanded="!!state.stack" aria-controls="profile-skills" @click="state.stack = state.stack ? undefined : true"
                                >{{ state.stack ? '[−]' : '[+]' }} stack.tsv</button>
                            </dd>
                        </div>
                        <div v-if="shell" :class="row"><NuxtIcon name="mingcute:terminal-box-line" :class="icon"/><dt class="lowercase">{{ t('profile.shell') }}</dt><dd :class="value">{{ shell }}</dd></div>
                        <div v-if="data.summary.status" :class="row"><NuxtIcon name="mingcute:target-line" :class="icon"/><dt class="lowercase">{{ t('profile.status') }}</dt><dd :class="value">{{ data.summary.status }}</dd></div>
                        <div v-if="config.site.url" :class="row" class="hidden! print:grid!"><NuxtIcon name="mingcute:globe-2-line" :class="icon"/><dt class="lowercase">{{ t('profile.web') }}</dt><dd :class="value">{{ methods.bare(config.site.url) }}</dd></div>
                        <div v-if="links.length" :class="row" class="print:items-start">
                            <NuxtIcon name="mingcute:link-line" :class="icon" class="print:mt-1"/><dt class="lowercase">{{ t('profile.links') }}</dt>
                            <dd :class="value">
                                <template v-for="(link, index) in links" :key="link.to"><NuxtLink :to="link.to" target="_blank" class="terminal-link print:hidden">{{ link.label.toLowerCase() }}</NuxtLink><span v-if="index < links.length - 1" class="text-comment print:hidden">, </span><span class="hidden print:block">{{ methods.bare(link.to) }}</span></template>
                            </dd>
                        </div>
                    </dl>
                </div>

                <div class="flex shrink-0" aria-hidden="true">
                    <span v-for="color in palette" :key="color" class="h-3 w-6" :class="color"/>
                </div>
            </div>

            <div class="col-span-full border-t border-default px-8 pt-6 pb-7 max-sm:p-4">
                <h1 id="profile-name" class="mb-2 text-lg! leading-6.5 font-bold max-sm:text-base!">{{ bio.heading }}</h1>
                <MDC v-if="bio.body" v-slot="{ body }" :value="bio.body">
                    <MDCRenderer v-if="body" :body="body" :prose="false" :components="{ ResponseBlock: 'div' }" class="max-w-220 text-sm/5.5 max-sm:text-compact/5 text-default/78 md-strong"/>
                </MDC>
            </div>
        </div>

        <div
            v-if="groups.length"
            id="profile-skills"
            class="grid transition-all duration-300 motion-reduce:transition-none print:grid-rows-open print:opacity-100"
            :class="state.stack ? 'grid-rows-open opacity-100' : 'grid-rows-closed opacity-0'"
            :inert="!state.stack"
        >
            <div class="min-h-0 overflow-hidden">
                <CommonTSV :label="t('labels.stack')" :rows="groups.map((group) => ({ type: group.type, items: group.items.map((skill) => skill.name) }))" wide class="border-t border-default"/>
            </div>
        </div>
    </LayoutSection>
</template>
