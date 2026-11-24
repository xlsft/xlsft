<script setup lang="ts">
    const { t } = useI18n()
    // collapsible — компании можно сворачивать до шапки (логотип, последняя роль, период);
    // по умолчанию раскрыты только места с текущей позицией. На print-странице не передаётся — там всё раскрыто
    const props = defineProps<{ data: IndexQuery, collapsible?: boolean }>()

    type Company = IndexQuery['experience'][number]

    // компании, состояние которых пользователь переключил относительно дефолтного
    const toggled = ref(new Set<string>())
    const toggle = (company: Company) => {
        if (!props.collapsible) return
        const next = new Set(toggled.value)
        if (!next.delete(company.name)) next.add(company.name)
        toggled.value = next
    }

    const isCurrent = (company: Company) => company.positions.some(position => !position.duration.to)
    const isCollapsed = (company: Company) => !!props.collapsible && isCurrent(company) === toggled.value.has(company.name)

    // период работы в компании целиком: от первой позиции до последней
    const companyPeriod = (company: Company) => useExperience(company.positions.at(-1)?.duration.from!, company.positions.at(0)?.duration.to)

    // комментарий к периоду: стаж, а если позиций несколько — ещё и их число
    const companyTotal = (company: Company) => {
        const count = company.positions.length
        const duration = companyPeriod(company).duration()
        return count > 1 ? `${useNumberCase(count, t('positions.one'), t('positions.two'), t('positions.more'))}, ${duration}` : duration
    }
</script>

<template>
    <section class="p-8 max-lg:p-4 flex flex-col relative">
        <div class="flex flex-col gap-8 relative pl-20 pb-12 last:pb-0 max-lg:pl-0! max-lg:pb-10" :key="company.name" v-for="company, i in data.experience">
            <div class="h-full w-px bg-border absolute top-0 left-6 max-lg:hidden" v-if="data.experience.length !== Number(i) + 1"></div>
            <AtomsPattern name="texture" class="[&_div]:scale-3000 overflow-hidden pointer-events-none w-12 h-12 border absolute! top-0 left-0 bg-default z-2 flex items-center justify-center text-default/50 text-sm! max-lg:hidden">{{ (data.experience.length - Number(i) - 1).toString().padStart(2, '0') }}</AtomsPattern>

            <div class="flex flex-col">
                <header class="company-head group" :class="collapsible && 'cursor-pointer'" @click="toggle(company)">
                    <div class="company-logo flex items-center h-12 max-lg:h-9 min-w-0">
                        <AtomsThemedImage v-if="company.logo?.dark || company.logo?.light" :src="company.logo" class="h-full w-fit" loading="lazy" :alt="company.name"/>
                        <!-- нет логотипа — собираем похожий: знак с первой буквой + название -->
                        <span v-else class="flex items-center gap-3 h-full min-w-0">
                            <span aria-hidden="true" class="h-full aspect-square flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">{{ company.name.charAt(0) }}</span>
                            <span class="text-2xl max-lg:text-lg font-bold leading-tight truncate">{{ company.name }}</span>
                        </span>
                    </div>

                    <!-- свёрнуто — последняя роль; раскрыто — ссылка и стаж (с числом позиций, если их несколько) -->
                    <div class="company-sub min-w-0 text-sm">
                        <span v-if="isCollapsed(company)" class="text-base font-bold text-default">{{ company.positions.at(0)?.name }}</span>
                        <span v-else class="flex flex-wrap gap-x-4 gap-y-1">
                            <NuxtLink v-if="company.link" :to="company.link" target="_blank" class="text-default/50 hover:text-default transition-colors" @click.stop>{{ company.link }}</NuxtLink>
                            <span class="text-(--ui-text-comment) text-nowrap"># {{ companyTotal(company) }}</span>
                        </span>
                    </div>

                    <span class="company-period text-sm text-default text-nowrap">{{ companyPeriod(company).range() }}</span>

                    <button v-if="collapsible" type="button" class="company-toggle print:hidden text-sm text-nowrap text-(--ui-text-comment) transition-colors group-hover:text-primary cursor-pointer"
                        :aria-expanded="!isCollapsed(company)" @click.stop="toggle(company)"
                    >{{ isCollapsed(company) ? `[+] ${t('labels.show_details')}` : `[−] ${t('labels.hide_details')}` }}</button>
                </header>

                <!-- тело компании: раскрывается анимацией высоты (grid-template-rows 0fr → 1fr); отступ от шапки внутри, чтобы схлопывался вместе с телом -->
                <div class="company-body" :class="isCollapsed(company) && 'is-collapsed'" :inert="isCollapsed(company) || undefined">
                    <div class="company-body-inner flex flex-col gap-4">
                        <!-- отступ от шапки — контентом, а не padding: padding не схлопывается при 0fr -->
                        <div aria-hidden="true"></div>
                        <MDC v-if="company.about" :value="company.about" class="*:my-0! *:leading-4 *:text-xs! *:text-default/50"/>

                        <div class="flex flex-col gap-6 mt-2">
                            <div class="conf flex flex-col gap-0.5 relative break-inside-avoid text-[15px] leading-[26px] max-lg:text-sm max-lg:leading-[22px] max-lg:gap-2.5 print:gap-0.5" :key="position.name" v-for="position in company.positions"
                                :class="[company.positions.length > 1 && 'max-lg:pl-3.5 max-lg:border-l']"
                                :style="company.positions.length > 1 && !position.duration.to ? { borderColor: 'var(--ui-primary)' } : undefined"
                            >
                                <div class="w-10 h-px absolute top-[13px] -left-14 max-lg:hidden" :class="position.duration.to ? 'bg-border' : 'bg-primary'" v-if="company.positions.length > 1"></div>

                                <span :class="position.duration.to ? 'text-dimmed' : 'text-primary'">[[position]] <span class="text-(--ui-text-comment)" v-if="!position.duration.to"># {{ t('labels.current_position') }}</span></span>

                                <div class="conf-kv">
                                    <span class="conf-k">role</span>
                                    <h3 class="conf-v text-lg! max-lg:text-base! leading-[26px] font-bold text-default">{{ position.name }}</h3>
                                </div>

                                <div class="conf-kv">
                                    <span class="conf-k">period</span>
                                    <span class="conf-v">{{ useExperience(position.duration.from, position.duration.to).range() }} <span class="text-(--ui-text-comment)"># {{ useExperience(position.duration.from, position.duration.to).duration() }}</span></span>
                                </div>

                                <div class="conf-md" v-if="position.description"><MDC :value="position.description" class="md *:my-0!"/></div>

                                <div class="conf-kv" v-if="position.skills?.length">
                                    <span class="conf-k">stack</span>
                                    <!-- массив конфига, как contacts в legal.conf: скобки и запятые цветом комментария -->
                                    <span class="conf-v"><span class="text-(--ui-text-comment)">[</span><template v-for="(item, index) in position.skills" :key="item.name"><span>{{ item.name }}</span><span v-if="index < position.skills.length - 1" class="text-(--ui-text-comment)">, </span></template><span class="text-(--ui-text-comment)">]</span></span>
                                </div>
                            </div>

                        </div>

                        <MDC v-if="company.footer" :value="company.footer" class="md *:my-0! *:text-sm *:text-default/50"/>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
    /* шапка компании — две строки: логотип / период, подзаголовок / переключатель.
       первая строка высотой с номер слева (48px), чтобы номер и логотип стояли на одной линии */
    .company-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas: "logo period" "sub toggle";
        column-gap: 24px;
        row-gap: 10px;
    }
    .company-logo { grid-area: logo; }
    .company-sub { grid-area: sub; align-self: baseline; }
    .company-period { grid-area: period; align-self: center; text-align: right; }
    .company-toggle { grid-area: toggle; align-self: baseline; justify-self: end; }

    /* на мобильном: логотип, роль, ниже период слева и переключатель справа */
    @media (max-width: 1023.98px) {
        .company-head {
            grid-template-columns: auto minmax(0, 1fr);
            grid-template-areas: "logo logo" "sub sub" "period toggle";
            column-gap: 12px;
            row-gap: 8px;
        }
        .company-period { text-align: left; }
    }

    /* раскрытие тела компании: высота анимируется через grid-template-rows, по вертикали обрезаем,
       по горизонтали нет — иначе срежутся выносные линии позиций слева. Сворачиваем только на экране, в печати показываем всё */
    .company-body {
        display: grid;
        grid-template-rows: 1fr;
        transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
    }
    .company-body-inner { min-height: 0; overflow-x: visible; overflow-y: clip; }
    @media screen { .company-body.is-collapsed { grid-template-rows: 0fr; opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .company-body { transition: none; } }

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

    /* на узком экране ключи над значениями; в печати ширины A4 хватает на колонки, поэтому только screen */
    @media screen and (max-width: 1023.98px) {
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
