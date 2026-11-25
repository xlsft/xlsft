<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        company: Company
        number: string
        last?: boolean
        collapsible?: boolean
    }>()

    const { t } = useI18n()
    const cmsStore = useCmsStore()

    const pair = 'grid grid-cols-conf items-start py-0.75 mobile-screen:flex mobile-screen:flex-col mobile-screen:gap-0.5 mobile-screen:p-0'
    const key = 'relative text-dimmed after:absolute after:left-24 after:text-line after:content-[\'=\'] mobile-screen:text-xs mobile-screen:leading-4 mobile-screen:after:static mobile-screen:after:text-dimmed mobile-screen:after:content-[\'_=\']'
    const value = 'col-start-3 min-w-0 text-default/78'

    const state = ref<{ open?: boolean }>({ open: props.company.positions.some((position) => !position.duration.to) || undefined })

    const methods = {
        toggle(): void {
            if (props.collapsible) state.value.open = state.value.open ? undefined : true
        },
        total(): string {
            const duration = cmsStore.span(props.company.positions.at(-1)!.duration.from, props.company.positions.at(0)?.duration.to).duration()
            const count = props.company.positions.length
            return count > 1 ? `${plural(count, t('positions.one'), t('positions.two'), t('positions.more'))}, ${duration}` : duration
        },
    }

    const collapsed = computed<boolean>(() => !!props.collapsible && !state.value.open)

    const period = computed<string>(() => cmsStore.span(props.company.positions.at(-1)!.duration.from, props.company.positions.at(0)?.duration.to).range())

</script>

<template>
    <div class="relative flex flex-col gap-8 pb-12 pl-20 last:pb-0 max-lg:pb-10 max-lg:pl-0!">
        <div v-if="!props.last" class="absolute top-0 left-6 h-full w-px bg-border max-lg:hidden"/>
        <span class="absolute top-0 left-0 z-2 flex size-12 items-center justify-center border border-default bg-default text-sm! text-default/50 max-lg:hidden">{{ props.number }}</span>

        <div class="flex flex-col">
            <header
                class="group grid grid-cols-head gap-x-6 gap-y-2.5 max-lg:grid-cols-head-sm max-lg:gap-x-3 max-lg:gap-y-2"
                :class="props.collapsible && 'cursor-pointer'"
                @click="methods.toggle"
            >
                <div class="flex h-12 min-w-0 items-center col-start-1 row-start-1 max-lg:col-span-2 max-lg:h-9">
                    <CommonImage v-if="props.company.logo?.dark || props.company.logo?.light" :src="props.company.logo" skeleton="h-full w-32" class="h-full w-fit" loading="lazy" :alt="props.company.name"/>
                    <span v-else class="flex items-center gap-3 h-full min-w-0">
                        <span aria-hidden="true" class="h-full aspect-square flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">{{ props.company.name.charAt(0) }}</span>
                        <span class="text-2xl/tight max-lg:text-lg font-bold truncate">{{ props.company.name }}</span>
                    </span>
                </div>

                <div class="min-w-0 self-baseline text-sm col-start-1 row-start-2 max-lg:col-span-2">
                    <span v-if="collapsed" class="text-base font-bold text-default">{{ props.company.positions.at(0)?.name }}</span>
                    <span v-else class="flex flex-wrap gap-x-4 gap-y-1">
                        <NuxtLink v-if="props.company.link" :to="props.company.link" target="_blank" class="text-default/50 hover:text-default transition-colors" @click.stop>{{ props.company.link }}</NuxtLink>
                        <span class="text-comment text-nowrap"># {{ methods.total() }}</span>
                    </span>
                </div>

                <span class="self-center text-right text-sm text-nowrap text-default col-start-2 row-start-1 max-lg:col-start-1 max-lg:row-start-3 max-lg:text-left">{{ period }}</span>

                <button v-if="props.collapsible" type="button" class="self-baseline justify-self-end col-start-2 row-start-2 max-lg:row-start-3 print:hidden text-sm text-nowrap text-comment transition-colors group-hover:text-primary cursor-pointer"
                        :aria-expanded="!collapsed" @click.stop="methods.toggle"
                >{{ collapsed ? `[+] ${t('labels.show_details')}` : `[−] ${t('labels.hide_details')}` }}</button>
            </header>

            <div
                class="grid grid-rows-open transition-all duration-350 ease-in-out motion-reduce:transition-none"
                :class="collapsed && 'screen:grid-rows-closed screen:opacity-0'"
                :inert="collapsed || undefined"
            >
                <div class="flex min-h-0 flex-col gap-4 overflow-x-visible overflow-y-clip">
                    <div aria-hidden="true"></div>
                    <MDC v-if="props.company.about" :value="props.company.about" class="*:my-0! *:leading-4 *:text-xs! *:text-default/50"/>

                    <div class="flex flex-col gap-6 mt-2">
                        <div class="flex flex-col gap-0.5 relative break-inside-avoid text-terminal/6.5 max-lg:text-sm/5.5 max-lg:gap-2.5 print:gap-0.5" :key="position.name" v-for="position in props.company.positions"
                             :class="[props.company.positions.length > 1 && 'max-lg:pl-3.5 max-lg:border-l']"
                             :style="props.company.positions.length > 1 && !position.duration.to ? { borderColor: 'var(--ui-primary)' } : undefined"
                        >
                            <div class="w-10 h-px absolute top-3.25 -left-14 max-lg:hidden" :class="position.duration.to ? 'bg-border' : 'bg-primary'" v-if="props.company.positions.length > 1"></div>

                            <CommonHighlight :text="position.duration.to ? `\0d[[position]]` : `\0p[[position]] \0c# ${t('labels.current_position')}`"/>

                            <div :class="pair">
                                <span :class="key">role</span>
                                <h3 :class="value" class="text-lg! leading-6.5 font-bold text-default! max-lg:text-base!">{{ position.name }}</h3>
                            </div>

                            <div :class="pair">
                                <span :class="key">period</span>
                                <span :class="value">{{ cmsStore.span(position.duration.from, position.duration.to).range() }} <span class="text-comment"># {{ cmsStore.span(position.duration.from, position.duration.to).duration() }}</span></span>
                            </div>

                            <div v-if="position.description" class="conf-md"><MDC :value="position.description" class="md *:my-0!"/></div>

                            <div v-if="position.skills?.length" :class="pair">
                                <span :class="key">stack</span>
                                <span :class="value"><span class="text-comment">[</span><template v-for="(item, index) in position.skills" :key="item.name"><span>{{ item.name }}</span><span v-if="index < position.skills.length - 1" class="text-comment">, </span></template><span class="text-comment">]</span></span>
                            </div>
                        </div>

                    </div>

                    <MDC v-if="props.company.footer" :value="props.company.footer" class="md *:my-0! *:text-sm *:text-default/50"/>
                </div>
            </div>
        </div>
    </div>
</template>
