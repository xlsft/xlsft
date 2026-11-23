<script setup lang="ts">
    const { t } = useI18n()
    const route = useRoute()
    const props = defineProps<{ data: IndexQuery }>()

    // общий стаж и число позиций в компании — комментарий в шапке, только если позиций больше одной
    const companyTotal = (company: IndexQuery['experience'][number]) => {
        const count = company.positions.length
        const duration = useExperience(company.positions.at(-1)?.duration.from!, company.positions.at(0)?.duration.to).duration()
        return `${count} ${useNumberCase(count, t('positions.one'), t('positions.two'), t('positions.more'))}, ${duration}`
    }
</script>

<template>
    <section class="p-8 max-lg:p-4 print:px-0! flex flex-col relative">
        <div class="flex flex-col gap-8 relative pl-20 pb-12 last:pb-0 max-lg:pl-0! max-lg:pb-10" :key="company.name" v-for="company, i in data.experience">
            <div class="h-full w-px bg-border absolute top-0 left-6 max-lg:hidden" v-if="data.experience.length !== Number(i) + 1"></div>
            <AtomsPattern name="texture" class="[&_div]:scale-3000 overflow-hidden pointer-events-none w-12 h-12 border absolute! top-0 left-0 bg-default z-2 flex items-center justify-center text-default/50 text-sm! max-lg:hidden">{{ (data.experience.length - Number(i) - 1).toString().padStart(2, '0') }}</AtomsPattern>

            <div class="flex flex-col gap-4">
                <template v-if="!route.query.short">
                    <NuxtImg v-if="company.logo" :src="company.logo" class="h-12 max-lg:h-6 w-fit flex items-center text-2xl font-bold" loading="lazy" :alt="company.name"/>
                    <span v-else class="h-12 max-lg:h-6 w-fit flex items-center text-2xl font-bold">{{ company.name }}</span>
                </template>

                <div class="flex flex-col items-end gap-2 *:leading-4 *:text-sm! *:text-nowrap absolute top-0 right-0 max-lg:static max-lg:items-start" v-if="!route.query.short">
                    <NuxtLink v-if="company.link" :to="company.link" target="_blank" class="text-default/50">{{ company.link }}</NuxtLink>
                    <span v-if="company.positions.length > 1" class="text-dimmed"># {{ companyTotal(company) }}</span>
                </div>

                <MDC v-if="company.about && !route.query.short" :value="company.about" class="*:my-0! *:leading-4 *:text-xs! *:text-default/50"/>

                <div class="flex flex-col gap-6 mt-2">
                    <div class="conf flex flex-col gap-0.5 relative break-inside-avoid text-[15px] leading-[26px] max-lg:text-sm max-lg:leading-[22px] max-lg:gap-2.5" :key="position.name" v-for="position in company.positions"
                        :class="company.positions.length > 1 && 'max-lg:pl-3.5 max-lg:border-l'"
                        :style="company.positions.length > 1 && !position.duration.to ? { borderColor: 'var(--ui-primary)' } : undefined"
                    >
                        <div class="w-10 h-px absolute top-[13px] -left-14 max-lg:hidden" :class="position.duration.to ? 'bg-border' : 'bg-primary'" v-if="company.positions.length > 1"></div>

                        <span :class="position.duration.to ? 'text-dimmed' : 'text-primary'">[[position]] <span class="text-dimmed" v-if="!position.duration.to"># {{ t('labels.current_position') }}</span></span>

                        <div class="conf-kv">
                            <span class="conf-k">role</span>
                            <h3 class="conf-v text-lg! max-lg:text-base! leading-[26px] font-bold text-default"><span v-if="route.query.short" class="text-dimmed">{{ company.name }} / </span>{{ position.name }}</h3>
                        </div>

                        <div class="conf-kv">
                            <span class="conf-k">period</span>
                            <span class="conf-v">{{ useExperience(position.duration.from, position.duration.to).range() }} <span class="text-dimmed"># {{ useExperience(position.duration.from, position.duration.to).duration() }}</span></span>
                        </div>

                        <div class="conf-md" v-if="position.description"><MDC :value="position.description" class="md *:my-0!"/></div>

                        <div class="conf-kv" v-if="position.skills?.length">
                            <span class="conf-k">stack</span>
                            <div class="conf-v flex flex-wrap gap-1 print:block">
                                <AtomsBadge v-for="item in position.skills" :key="item.name" :color="item.color">{{ item.name }}</AtomsBadge>
                            </div>
                        </div>
                    </div>
                </div>

                <MDC v-if="company.footer && !route.query.short" :value="company.footer" class="md *:my-0! *:text-sm *:text-default/50"/>
            </div>
        </div>
    </section>
</template>

<style scoped>
    /* позиция как секция experience.conf: ключ / знак "=" / значение.
       описание — обычный markdown: первый абзац → summary, список → scope, цитата → result */
    .conf {
        --conf-key: 96px;
        --conf-gap: 24px;
    }

    .conf-kv {
        display: grid;
        grid-template-columns: var(--conf-key) var(--conf-gap) minmax(0, 1fr);
        align-items: start;
        padding: 3px 0;
    }
    .conf-k { position: relative; color: var(--ui-text-dimmed); }
    .conf-k::after { content: "="; position: absolute; left: var(--conf-key); color: var(--ui-border); }
    .conf-v { grid-column: 3; min-width: 0; color: color-mix(in srgb, var(--ui-text) 78%, var(--ui-bg)); }

    .conf-md :deep(.md) { gap: 0 !important; color: color-mix(in srgb, var(--ui-text) 78%, var(--ui-bg)); }
    .conf-md :deep(.md > *) {
        position: relative;
        padding: 3px 0 3px calc(var(--conf-key) + var(--conf-gap)) !important;
        font-size: inherit !important;
        line-height: inherit !important;
    }
    .conf-md :deep(.md > *::before) {
        content: var(--k, "");
        position: absolute;
        left: 0;
        top: 3px;
        color: var(--ui-text-dimmed);
        font-style: normal;
        font-weight: normal;
    }
    .conf-md :deep(.md > *::after) {
        content: var(--eq, "");
        position: absolute;
        left: var(--conf-key);
        top: 3px;
        color: var(--ui-border);
        font-style: normal;
    }
    .conf-md :deep(.md > p:first-child) { --k: "summary"; --eq: "="; }
    .conf-md :deep(.md > ul), .conf-md :deep(.md > ol) { --k: "scope"; --eq: "="; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 2px; }
    .conf-md :deep(.md > blockquote) { --k: "result"; --eq: "="; border: 0 !important; font-style: normal !important; color: var(--ui-text); font-weight: 700; }

    /* пункт scope: "- **frontend** текст" → первый жирный — подключ в своей колонке */
    .conf-md :deep(li) { position: relative; padding-left: 132px; }
    .conf-md :deep(li > p), .conf-md :deep(blockquote > p) { margin: 0; }
    .conf-md :deep(li > strong:first-child), .conf-md :deep(li > p:first-child > strong:first-child) {
        position: absolute;
        left: 0;
        width: 120px;
        font-weight: 400 !important;
        color: var(--ui-text);
    }

    @media (max-width: 1023.98px) {
        .conf-kv { display: flex; flex-direction: column; gap: 2px; padding: 0; }
        .conf-kv .conf-k, .conf-md :deep(.md > *::before) { font-size: 12px; line-height: 16px; }
        .conf-kv .conf-k::after { content: " ="; position: static; margin: 0; color: var(--ui-text-dimmed); }

        .conf-md :deep(.md) { gap: 10px !important; }
        .conf-md :deep(.md > *) { padding: 0 !important; }
        .conf-md :deep(.md > *::before) { content: var(--k-m, ""); position: static; display: block; margin-bottom: 2px; }
        .conf-md :deep(.md > *::after) { content: none; }
        .conf-md :deep(.md > p:first-child) { --k-m: "summary ="; }
        .conf-md :deep(.md > ul), .conf-md :deep(.md > ol) { --k-m: "scope ="; gap: 6px; }
        .conf-md :deep(.md > blockquote) { --k-m: "result ="; }

        .conf-md :deep(li) { padding-left: 0; }
        .conf-md :deep(li > strong:first-child), .conf-md :deep(li > p:first-child > strong:first-child) { position: static; display: block; width: auto; }
    }
</style>
