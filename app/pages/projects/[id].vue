<script setup lang="ts">
    import Skeleton from '~/assets/svg/skeleton.svg'
    import useMarkdownRemoval from 'remove-markdown'

    const { t, locale } = useI18n()
    const route = useRoute()

    const sectionBorder = 'border-t-8 border-default'

    const params = ref({ id: route.params.id?.toString() }); watch(() => route.params.id, () => params.value.id = route.params.id?.toString())
    const { data } = await useClarityDynamicQuery<any>(groq`*[_type == "project" && id == $id] {
        "seo": *[_type == "summary"][0] {
            "title": title[$locale],
        },
        id, links, tags, repo,
        "name": name[$locale],
        "description": description[$locale],
        "thumbnail": { "dark": thumbnail.dark.asset->url, "light": thumbnail.light.asset->url },
        "images": images[].asset->url,
        "about": about[$locale],
        "stack": stack[]->{
            name, type, color, priority
        } | order(priority desc),
        "status": status[$locale],
        "copyright": copyright[$locale]
    }[0]`, params);

    if (!data.value) throw createError({ status: 404, message: `"${route.params.id?.toString()}" Project not found` })

    const gallery = computed<string[]>(() => (data.value?.images ?? []).filter(Boolean))
    const selectedImage = ref(0)
    watch(gallery, () => { selectedImage.value = 0 })

    const repo = data.value?.repo ? await useGithubRepository<any>(data.value?.repo) : undefined

    // теги из CMS и топики репозитория — одним списком, без повторов
    const tags = computed<string[]>(() => [...new Set([...(data.value?.tags ?? []), ...(repo?.topics ?? [])])])

    // stack.tsv: строка на категорию, как bat stack.tsv в профиле на главной
    const stackGroups = computed(() => {
        const groups = new Map<string, string[]>()
        for (const item of data.value?.stack ?? []) {
            const type = item.type || 'other'
            const names = groups.get(type)
            if (names) names.push(item.name)
            else groups.set(type, [item.name])
        }
        return Array.from(groups, ([type, items]) => ({ type, items }))
    })

    const host = (link: string) => { try { return new URL(link).host.replace(/^www\./, '') } catch { return link } }

    useSeoMeta({
        title: data.value?.name,
        ogTitle: `${data.value?.seo?.title || ''} — ${data.value?.name}`,
        description: useMarkdownRemoval(data.value?.description),
        ogDescription: useMarkdownRemoval(data.value?.description),
        ogImage: data.value.thumbnail?.dark || data.value.thumbnail?.light || undefined
    })

</script>

<template>
    <!-- шапка-команда, как у секций главной: путь ведёт обратно к списку проектов -->
    <MoleculesHomeSectionHeader>
        <template #command>
            <code class="command">
                <NuxtLink :to="`/${locale}#projects`" class="text-dimmed! no-underline! hover:text-primary! transition-colors">~/projects/</NuxtLink><span class="text-default">{{ data.id }}</span> <span class="text-primary">$</span> cat <span class="text-success">readme.md</span>
            </code>
        </template>
    </MoleculesHomeSectionHeader>

    <!-- широкий thumbnail на клетке -->
    <div v-if="data.thumbnail?.dark || data.thumbnail?.light" class="paper relative border-b border-default p-8 max-sm:p-4">
        <AtomsThemedImage :src="data.thumbnail" :alt="data.name" fetchpriority="high" class="relative w-full aspect-[4/1] object-cover border border-default bg-default"/>
    </div>

    <!-- название + project.conf: ячейки стыкуются через gap-px, общий бордер не рвётся -->
    <div class="grid gap-px bg-(--ui-border) lg:grid-cols-2">
        <div class="flex min-w-0 flex-col justify-center gap-3 bg-default p-8 max-sm:p-4">
            <div class="flex flex-wrap items-center gap-3">
                <h1 class="leading-tight! max-sm:text-3xl!">{{ data.name }}</h1>
            </div>
            <MDC v-if="data.description" :value="data.description" class="md max-w-prose *:my-0!"/>
        </div>

        <div class="conf flex min-w-0 flex-col justify-center gap-0.5 bg-default p-8 max-sm:p-4">
            <span class="text-primary">[project] <span class="comment"># project.conf</span></span>
            <dl class="m-0">
                <div v-if="data.status" class="conf-kv"><dt class="conf-k">status</dt><dd class="conf-v text-primary!">"{{ data.status }}"</dd></div>
                <div v-if="data.repo" class="conf-kv">
                    <dt class="conf-k">repo</dt>
                    <dd class="conf-v">
                        <NuxtLink :to="`https://github.com/${data.repo}`" target="_blank" class="act">{{ data.repo }}</NuxtLink>
                        <span v-if="repo?.stars" class="comment"> # ★ {{ repo.stars }}</span>
                    </dd>
                </div>
                <div v-if="data.links?.length" class="conf-kv">
                    <dt class="conf-k">links</dt>
                    <dd class="conf-v">
                        <template v-for="(link, index) in data.links" :key="link"><NuxtLink :to="link" target="_blank" class="act">{{ host(link) }}</NuxtLink><span v-if="index < data.links.length - 1" class="comment">, </span></template>
                    </dd>
                </div>
                <div v-if="tags.length" class="conf-kv">
                    <dt class="conf-k">tags</dt>
                    <dd class="conf-v"><span class="comment">[</span><template v-for="(tag, index) in tags" :key="tag"><span class="text-success">{{ tag }}</span><span v-if="index < tags.length - 1" class="comment">, </span></template><span class="comment">]</span></dd>
                </div>
                <div v-if="data.stack?.length" class="conf-kv">
                    <dt class="conf-k">stack</dt>
                    <dd class="conf-v">{{ data.stack.length }} <a href="#stack" class="act ml-[1ch]">[+] stack.tsv</a></dd>
                </div>
            </dl>
        </div>
    </div>

    <template v-if="data.about || stackGroups.length">
        <MoleculesHomeSectionHeader :class="sectionBorder">
            <template #command>
                <code class="command">
                    <span class="text-dimmed">~/projects/{{ data.id }}</span> <span class="text-primary">$</span>
                    <template v-if="data.about"> cat <span class="text-success">about.md</span></template>
                    <template v-if="data.about && stackGroups.length"><span class="text-dimmed"> &amp;&amp;</span></template>
                    <template v-if="stackGroups.length"> bat <span class="text-success">stack.tsv</span></template>
                </code>
            </template>
        </MoleculesHomeSectionHeader>

        <div class="flex flex-wrap gap-px bg-(--ui-border)">
            <article v-if="data.about" class="flex min-w-0 flex-[999_1_560px] flex-col gap-4 bg-default p-8 max-sm:p-4">
                <h2 class="text-lg! leading-[26px]">{{ t('sections.about_project') }}</h2>
                <MDC :value="data.about" class="md about max-w-[72ch] overflow-x-auto"/>
                <p v-if="data.copyright" class="comment text-sm"># {{ data.copyright }}</p>
            </article>

            <!-- вывод bat: гуттер с номерами строк, первая строка tsv — заголовок -->
            <!-- линия гуттера рисуется ячейкой на всю высоту, а сама таблица липнет к шапке, пока читается about -->
            <div v-if="stackGroups.length" id="stack" class="stack relative flex min-w-0 flex-[1_1_340px] items-start bg-default scroll-mt-24">
                <table class="tsv" :aria-label="t('labels.stack')">
                    <thead>
                        <tr><td aria-hidden="true" class="line">1</td><th scope="col">category<span aria-hidden="true" class="tab">⇥</span></th><th scope="col">items</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(group, index) in stackGroups" :key="group.type">
                            <td aria-hidden="true" class="line">{{ index + 2 }}</td>
                            <th scope="row">{{ group.type }}<span aria-hidden="true" class="tab">⇥</span></th>
                            <td>
                                <template v-for="(name, nameIndex) in group.items" :key="name"><span>{{ name }}</span><template v-if="nameIndex < group.items.length - 1"><span aria-hidden="true" class="tab">⇥</span><wbr></template></template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </template>

    <template v-if="gallery.length">
        <MoleculesHomeSectionHeader :class="sectionBorder">
            <template #command>
                <code class="command">
                    <span class="text-dimmed">~/projects/{{ data.id }}</span> <span class="text-primary">$</span> ls <span class="text-success">screenshots/</span>
                    <span class="comment text-sm"> # {{ String(selectedImage).padStart(2, '0') }} / {{ String(gallery.length - 1).padStart(2, '0') }}</span>
                </code>
            </template>
        </MoleculesHomeSectionHeader>

        <section :aria-label="data.name" class="paper relative flex flex-col gap-3 p-8 max-sm:p-4">
            <AtomsPreview v-model:index="selectedImage" :images="gallery" :label="data.name" :id="data.id" class="relative">
                <NuxtImg
                    :src="gallery[selectedImage] ?? gallery[0]"
                    :alt="`${data.name} · ${selectedImage + 1} / ${gallery.length}`"
                    class="h-80 w-full border border-default bg-default object-contain sm:h-120"
                    :placeholder="Skeleton"
                />
            </AtomsPreview>
            <MoleculesImageThumbnails v-model="selectedImage" :images="gallery" :label="data.name" class="relative"/>
        </section>
    </template>

    <!-- все остальные проекты — тот же блок, что на главной, без открытого -->
    <OrganismsProjectsSection id="projects" :class="sectionBorder" :exclude="data.id"/>
</template>

<style scoped>
    .command { font: inherit; font-size: 16px; line-height: 1.6; }
    .comment { color: var(--ui-text-comment); }

    /* клетка 24px — та же, что под фото профиля и в плитках проектов */
    .paper::before {
        content: ""; position: absolute; inset: 0; opacity: .6; pointer-events: none;
        background: linear-gradient(var(--ui-border) 1px, transparent 1px), linear-gradient(90deg, var(--ui-border) 1px, transparent 1px);
        background-size: 24px 24px; background-position: center;
    }

    /* project.conf — как experience.conf и legal.conf: ключ / "=" / значение */
    .conf { --conf-key: 9ch; --conf-gap: 2ch; font-size: 15px; line-height: 26px; }
    .conf-kv { display: grid; grid-template-columns: var(--conf-key) var(--conf-gap) minmax(0, 1fr); }
    .conf-k { position: relative; color: var(--ui-text-dimmed); }
    .conf-k::after { content: "="; position: absolute; left: var(--conf-key); color: var(--ui-border); }
    .conf-v { grid-column: 3; min-width: 0; margin: 0; overflow-wrap: anywhere; color: color-mix(in srgb, var(--ui-text) 78%, var(--ui-bg)); }

    /* кликабельное в выводе — цвет комментария, при наведении — основной (перебивает глобальный стиль ссылок) */
    .act { font: inherit; font-size: inherit !important; line-height: inherit !important; color: var(--ui-text-comment) !important; text-decoration: none !important; opacity: 1 !important; transition: color .15s; }
    .act:hover { color: var(--ui-text) !important; }
    .act:focus-visible { outline: 1px solid var(--ui-primary); outline-offset: 2px; }

    .about { font-size: 14px; line-height: 22px; }

    .stack { --gutter: calc(32px + 3ch + 16px); }
    .stack::before { content: ""; position: absolute; top: 0; bottom: 0; left: calc(var(--gutter) - 1px); width: 1px; background: var(--ui-border); pointer-events: none; }
    .tsv { position: sticky; top: var(--ui-header-height); width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 14px; line-height: 26px; }
    .tsv th, .tsv td { text-align: left; vertical-align: top; padding: 0; font-weight: 400; }
    .tsv thead > tr > * { padding-top: 20px; }
    .tsv tbody tr:last-child > * { padding-bottom: 24px; }
    .tsv .line { width: var(--gutter); padding-right: 16px; text-align: right; color: var(--ui-text-comment); font-variant-numeric: tabular-nums; }
    .tsv tr > :nth-child(2) { width: calc(24px + 12ch); padding-left: 24px; }
    .tsv tr > :last-child { padding-right: 32px; }
    .tsv thead th { color: var(--ui-text-comment); }
    .tsv tbody td:last-child { color: color-mix(in srgb, var(--ui-text) 78%, var(--ui-bg)); }
    .tsv tbody th { color: var(--ui-warning); }
    .tsv .tab { margin: 0 .5ch; color: var(--ui-border); }

    @media (max-width: 650px) {
        .command { font-size: 13px; }
        .conf { font-size: 13px; line-height: 22px; }
        .stack { --gutter: calc(16px + 2ch + 10px); }
        .tsv { font-size: 12px; line-height: 20px; }
        .tsv .line { padding-right: 10px; }
        .tsv tr > :nth-child(2) { width: calc(12px + 10ch); padding-left: 12px; }
        .tsv tr > :last-child { padding-right: 16px; }
    }
</style>
