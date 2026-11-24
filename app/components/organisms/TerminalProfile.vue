<script setup lang="ts">
    import { usePreferredReducedMotion } from "@vueuse/core"

    const { t } = useI18n()
    // print — печатная версия: stack.tsv сразу раскрыт, переключатель скрыт, у ссылок видны адреса
    const props = defineProps<{ data: IndexQuery, print?: boolean }>()
    const config = useRuntimeConfig().public.config
    const stackOpen = ref(!!props.print)
    const tailTokens = [
        { text: ' |', color: 'text-dimmed' },
        { text: ' tail ', color: 'text-default' },
        { text: '-n', color: 'text-info' },
        { text: ' 0', color: 'text-warning' }
    ]
    const tailLength = tailTokens.reduce((length, token) => length + token.text.length, 0)
    const visibleLength = ref(stackOpen.value ? 0 : tailLength)
    const reducedMotion = usePreferredReducedMotion()
    const visibleTail = computed(() => {
        let remaining = visibleLength.value
        return tailTokens.map(({ text, color }) => {
            const visible = text.slice(0, Math.max(0, remaining))
            remaining -= text.length
            return { text: visible, color }
        })
    })

    watch([stackOpen, reducedMotion], ([open, motion], _, onCleanup) => {
        const target = open ? 0 : tailLength
        if (motion === 'reduce' || visibleLength.value === target) {
            visibleLength.value = target
            return
        }
        const step = Math.sign(target - visibleLength.value)
        const timer = window.setInterval(() => {
            visibleLength.value += step
            if (visibleLength.value === target) window.clearInterval(timer)
        }, 28)
        onCleanup(() => window.clearInterval(timer))
    })

    const bio = computed(() => {
        const content = props.data.summary.content?.trim() || ''
        const heading = content.match(/^# +([^\n]+)(?:\n|$)/)
        return {
            heading: heading?.[1].trim() || props.data.summary.title,
            body: content.slice(heading?.[0].length ?? 0).trim() || props.data.summary.description
        }
    })

    // user@host как в шапке fastfetch
    const prompt = { user: 'root', host: 'xlsft' }

    // заголовок вида «Senior Frontend-разработчик (Илья Торшин)» → роль и имя отдельными строками
    const identity = computed(() => {
        const title = props.data.summary.title || ''
        const match = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
        return match ? { role: match[1], user: match[2] } : { role: title, user: '' }
    })

    // где работаю сейчас — компании с текущей позицией
    const host = computed(() => (props.data.experience ?? [])
        .filter(company => company.positions?.some(position => !position.duration?.to))
        .map(company => company.name)
        .join(', '))

    const groups = computed(() => (props.data.skills ?? [])
        .filter(group => group.items?.length)
        .map(group => ({
            type: group.type,
            items: [...group.items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        })))
    const packages = computed(() => groups.value.reduce((total, group) => total + group.items.length, 0))
    const shell = computed(() => groups.value.find(group => group.type === 'frontend')
        ?.items.slice(0, 3).map(skill => skill.name).join(', '))

    const uptime = computed(() => {
        const experience = props.data.experience
        const from = experience?.at(-1)?.positions?.at(-1)?.duration?.from
        return from ? useExperience(from, experience?.at(0)?.positions?.at(0)?.duration?.to).duration() : ''
    })

    const links = computed(() => Object.values(props.data.links ?? {})
        .filter((link): link is NonNullable<typeof link> => !!link?.to))
    // на бумаге ссылку не кликнуть — печатаем адрес без протокола
    const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

    // палитра терминала, как блоки цветов внизу вывода fastfetch
    const palette = ['bg-(--ui-border)', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-inverted']
</script>

<template>
    <section class="profile" aria-labelledby="profile-name">
        <MoleculesHomeSectionHeader>
            <template #command>
                <code class="command"><span class="text-dimmed">~/</span> <span class="text-primary">$</span> fastfetch<span class="text-dimmed"> &amp;&amp;</span> cat <span class="text-success">readme.md</span><template v-if="groups.length"><span class="text-dimmed"> &amp;&amp;</span> bat <span class="text-success">stack.tsv</span><span v-for="token in visibleTail" :key="token.color" :class="token.color">{{ token.text }}</span></template></code>
            </template>
        </MoleculesHomeSectionHeader>

        <div class="fetch" :class="{ 'has-photo': data.summary.image }">
            <div v-if="data.summary.image" class="photo-cell">
                <NuxtImg :src="data.summary.image" :alt="data.summary.title" width="576" height="576" fetchpriority="high" class="photo"/>
            </div>

            <div class="info">
                <!-- вывод neofetch в коробке: user@host на рамке, у каждой строки иконка и свой цвет палитры -->
                <div class="box">
                    <span class="prompt legend"><span class="text-primary">{{ prompt.user }}</span>@<span class="text-primary">{{ prompt.host }}</span></span>
                    <dl class="nf">
                        <div v-if="identity.user" class="row"><NuxtIcon name="mingcute:user-3-line" class="icon"/><dt>{{ t('profile.user') }}</dt><dd class="text-default">{{ identity.user }}</dd></div>
                        <div class="row"><NuxtIcon name="mingcute:briefcase-line" class="icon"/><dt>{{ t('profile.role') }}</dt><dd>{{ identity.role }}</dd></div>
                        <div v-if="host" class="row"><NuxtIcon name="mingcute:server-line" class="icon"/><dt>{{ t('profile.host') }}</dt><dd>{{ host }}</dd></div>
                        <div v-if="uptime" class="row"><NuxtIcon name="mingcute:time-line" class="icon"/><dt>{{ t('profile.uptime') }}</dt><dd>{{ uptime }}</dd></div>
                        <div v-if="packages" class="row">
                            <NuxtIcon name="mingcute:package-2-line" class="icon"/><dt>{{ t('profile.packages') }}</dt>
                            <!-- раскрытие stack.tsv — как переключатели в опыте: «[+] файл» цветом комментария; ссылки в links выглядят так же -->
                            <dd>
                                {{ packages }}
                                <button type="button" class="act stack-toggle" :aria-expanded="stackOpen" aria-controls="profile-skills" @click="stackOpen = !stackOpen"
                                >{{ stackOpen ? '[−]' : '[+]' }} stack.tsv</button>
                            </dd>
                        </div>
                        <div v-if="shell" class="row"><NuxtIcon name="mingcute:terminal-box-line" class="icon"/><dt>{{ t('profile.shell') }}</dt><dd>{{ shell }}</dd></div>
                        <div v-if="data.summary.status" class="row"><NuxtIcon name="mingcute:target-line" class="icon"/><dt>{{ t('profile.status') }}</dt><dd>{{ data.summary.status }}</dd></div>
                        <div v-if="config.head.url" class="row print-only"><NuxtIcon name="mingcute:globe-2-line" class="icon"/><dt>{{ t('profile.web') }}</dt><dd>{{ bareUrl(config.head.url) }}</dd></div>
                        <div v-if="links.length" class="row">
                            <NuxtIcon name="mingcute:link-line" class="icon"/><dt>{{ t('profile.links') }}</dt>
                            <dd>
                                <template v-for="(link, index) in links" :key="link.to"><NuxtLink :to="link.to" target="_blank" class="act">{{ link.label.toLowerCase() }}</NuxtLink><span v-if="index < links.length - 1" class="comment screen-only">, </span><span class="print-url">{{ bareUrl(link.to) }}</span></template>
                            </dd>
                        </div>
                    </dl>
                </div>

                <div class="palette" aria-hidden="true">
                    <span v-for="color in palette" :key="color" :class="color"/>
                </div>
            </div>

            <div class="about">
                <h1 id="profile-name">{{ bio.heading }}</h1>
                <MDC v-if="bio.body" v-slot="{ body }" :value="bio.body">
                    <MDCRenderer v-if="body" :body="body" :prose="false" :components="{ ResponseBlock: 'div' }" class="bio"/>
                </MDC>
            </div>
        </div>

        <div v-if="groups.length" id="profile-skills" class="skills-panel" :class="{ expanded: stackOpen }" :inert="!stackOpen">
            <div class="skills-clip">
                <!-- вывод bat: номера строк в гуттере, первая строка tsv — заголовок -->
                <table class="tsv" :aria-label="t('labels.stack')">
                    <thead>
                        <tr><td aria-hidden="true" class="line">1</td><th scope="col">category<span aria-hidden="true" class="tab">⇥</span></th><th scope="col">items</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(group, index) in groups" :key="group.type">
                            <td aria-hidden="true" class="line">{{ index + 2 }}</td>
                            <th scope="row">{{ group.type }}<span aria-hidden="true" class="tab">⇥</span></th>
                            <td>
                                <template v-for="(skill, skillIndex) in group.items" :key="skill.name"><span>{{ skill.name }}</span><template v-if="skillIndex < group.items.length - 1"><span aria-hidden="true" class="tab">⇥</span><wbr></template></template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</template>

<style scoped>
.profile { --cell-padding: 32px; --value: color-mix(in srgb, var(--ui-text) 78%, var(--ui-bg)); font-size: 15px; line-height: 26px; }
.command { font: inherit; font-size: 16px; line-height: 1.6; }

.fetch { display: grid; }
.has-photo { grid-template-columns: clamp(240px, 32%, 360px) minmax(0, 1fr); }

/* фото на клетке — та же сетка, что у плиток проектов */
/* фото — квадрат на ширину колонки, по центру клетки на всю высоту строки; ячейка сама не квадратная, иначе высокий вывод справа растягивает её вширь */
.photo-cell { position: relative; display: flex; align-items: center; justify-content: center; padding: var(--cell-padding); align-self: stretch; min-width: 0; }
.about { grid-column: 1 / -1; border-top: 1px solid var(--ui-border); padding: 24px var(--cell-padding) 28px; }
.has-photo .info { border-left: 1px solid var(--ui-border); }
.photo-cell::before {
    content: ""; position: absolute; inset: 0; opacity: .6; pointer-events: none;
    background: linear-gradient(var(--ui-border) 1px, transparent 1px), linear-gradient(90deg, var(--ui-border) 1px, transparent 1px);
    background-size: 24px 24px; background-position: center;
}
.photo { position: relative; width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid var(--ui-border); }

.info { display: flex; flex-direction: column; justify-content: center; gap: 20px; padding: var(--cell-padding) 40px; min-width: 0; }
.prompt { font-weight: 700; }
.about h1 { font-size: 18px !important; line-height: 26px; font-weight: 700; margin-bottom: 8px; }
.comment { color: var(--ui-text-comment); }

/* коробка neofetch: заголовок вписан в верхнюю линию рамки.
   не fieldset — Safari при печати считает высоту fieldset неверно, и рамка наезжает на палитру */
.box { position: relative; flex-shrink: 0; min-width: 0; margin-top: 13px; border: 1px solid var(--ui-border); padding: 23px 24px 16px; }
.legend { position: absolute; top: 0; left: 16px; transform: translateY(-50%); padding: 0 8px; line-height: 26px; background: var(--ui-bg); }
.palette { flex-shrink: 0; }

/* строка: иконка · ключ · значение; колонка ключей по самому длинному, строки — подсетка */
.nf { display: grid; grid-template-columns: 18px max-content minmax(0, 1fr); column-gap: 14px; margin: 0; }
.nf .row { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1; align-items: center; color: var(--row); }
.nf .icon { width: 18px; height: 18px; }
.nf dt { text-transform: lowercase; }
.nf dd { color: var(--value); overflow-wrap: anywhere; margin: 0; }
/* кликабельное в выводе (раскрытие stack.tsv и ссылки) — одинаково: цвет комментария без подчёркивания, при наведении — цвет строки.
   !important — перебить глобальный стиль ссылок из theme.css (text-sm!, text-default/50!, underline) */
.act { font: inherit; font-size: inherit !important; line-height: inherit !important; color: var(--ui-text-comment) !important; text-decoration: none !important; opacity: 1 !important; cursor: pointer; transition: color .15s; }
.act:hover, .act[aria-expanded="true"] { color: var(--row) !important; }
.act:focus-visible { outline: 1px solid var(--row); outline-offset: 2px; }
.stack-toggle { margin-left: 1ch; }

/* цвета строк — по кругу из палитры терминала */
.nf .row:nth-child(6n + 1) { --row: var(--ui-error); }
.nf .row:nth-child(6n + 2) { --row: var(--ui-warning); }
.nf .row:nth-child(6n + 3) { --row: var(--ui-success); }
.nf .row:nth-child(6n + 4) { --row: var(--ui-info); }
.nf .row:nth-child(6n + 5) { --row: var(--ui-primary); }
.nf .row:nth-child(6n + 6) { --row: var(--color-purple-500); }

.bio { color: var(--value); font-size: 14px; line-height: 22px; max-width: 880px; }
.bio :deep(strong) { color: var(--ui-text); }

.palette { display: flex; }
.palette span { width: 24px; height: 12px; }

.skills-panel { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 300ms ease, opacity 200ms ease; }
.skills-panel.expanded { grid-template-rows: 1fr; opacity: 1; }
.skills-clip { min-height: 0; overflow: hidden; }
@media (prefers-reduced-motion: reduce) {
    .skills-panel { transition: none; }
}

/* bat: гуттер с номерами строк, отделённый вертикальной линией на всю высоту */
.tsv { --gutter: calc(var(--cell-padding) + 3ch + 16px); width: 100%; table-layout: fixed; border-collapse: collapse; border-top: 1px solid var(--ui-border); font-size: 14px; line-height: 26px; }
.tsv th, .tsv td { text-align: left; vertical-align: top; padding: 0; font-weight: 400; }
.tsv thead > tr > * { padding-top: 20px; }
.tsv tbody tr:last-child > * { padding-bottom: 24px; }
.tsv .line { width: var(--gutter); padding-right: 16px; text-align: right; color: var(--ui-text-comment); border-right: 1px solid var(--ui-border); font-variant-numeric: tabular-nums; }
.tsv tr > :nth-child(2) { width: calc(24px + 120px); padding-left: 24px; }
.tsv tr > :last-child { padding-right: var(--cell-padding); }
.tsv thead th { color: var(--ui-text-comment); }
.tsv tbody td:last-child { color: var(--value); }
.tsv tbody th { color: var(--ui-warning); }
.tsv .tab { margin: 0 .5ch; color: var(--ui-border); }

.print-only, .print-url { display: none; }

/* печать: фон палитры и цвета строк — как на экране, stack.tsv раскрыт, ничего интерактивного */
@media print {
    .profile { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-only { display: grid; }
    .stack-toggle, .screen-only { display: none; }
    /* ссылки столбиком: вместо метки — сам адрес */
    .row:has(.print-url) { align-items: start; }
    .row:has(.print-url) .icon { margin-top: 4px; }
    .row:has(.print-url) .act { display: none; }
    .print-url { display: block; color: var(--value); }
    .skills-panel { grid-template-rows: 1fr; opacity: 1; transition: none; }
    /* .fetch не разрываем принудительно: WebKit при фрагментации может неверно считать высоту рамки */
    .tsv tr { break-inside: avoid; }
}

@media (max-width: 650px) {
    .profile { --cell-padding: 16px; font-size: 13px; line-height: 22px; }
    .command { font-size: 13px; }
    .has-photo { display: block; }
    .photo-cell { aspect-ratio: auto; border-bottom: 1px solid var(--ui-border); }
    .about { padding: var(--cell-padding); }
    .has-photo .info { border-left: 0; }
    .photo-cell { padding: 0; }
    .photo { border: 0; }
    .info { padding: var(--cell-padding); gap: 16px; }
    .about h1 { font-size: 16px !important; }
    .box { margin-top: 11px; padding: 17px 14px 12px; }
    .legend { left: 6px; line-height: 22px; }
    .nf { grid-template-columns: 15px max-content minmax(0, 1fr); column-gap: 8px; }
    .nf .icon { width: 15px; height: 15px; }
    .bio { font-size: 13px; line-height: 20px; }
    .tsv { font-size: 12px; line-height: 20px; }
    .tsv { --gutter: calc(var(--cell-padding) + 2ch + 10px); }
    .tsv .line { padding-right: 10px; }
    .tsv tr > :nth-child(2) { width: calc(12px + 76px); padding-left: 12px; }
}
</style>
