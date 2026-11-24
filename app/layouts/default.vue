<script setup lang="ts">
    import Logo from '~/assets/svg/logo.svg?raw'
    import { useScroll } from '@vueuse/core';
    import * as locales from '@nuxt/ui/locale'

    const assistant = useAssistant()

    const { locale, setLocale, locales: i18nLocales, t } = useI18n()
    const router = useRouter()
    const theme = useColorMode()
    const scroll = useScroll(document)
    const header = computed(() => window ? parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--ui-header-height')) : 0)
    const config = useRuntimeConfig().public.config
    const logoVariant = useState('footer-logo-variant', () => Math.floor(Date.now() / 864e5) % 6)

    const { data } = await useClarityDynamicQuery(groq`{
        "footer": {
            "legal": *[_type == "summary"][0].legal[$locale],
            "links": *[_type == "link"] {
                "label": short[$locale],
                "to": to
            }
        },
        "person": {
            "title": *[_type == "summary"][0].title[$locale],
            "description": *[_type == "summary"][0].description[$locale],
            "image": *[_type == "summary"][0].image.asset->url,
            "email": *[_type == "link" && id == "email"][0].label[$locale],
            "phone": *[_type == "link" && id == "phone"][0].label[$locale],
            "links": *[_type == "link"].to,
            "workplace": (*[_type == "experience"] | order(positions[0].duration.from desc) {
                link,
                "logo": logo[$theme].asset->url,
                "name": name[$locale],
                "d": positions[0].duration.from
            })[0],
            "skills": *[_type == "skill"]{
                name
            },
            "experience": *[_type == "experience"] {
                id, link,
                "name": name[$locale],
                "logo": logo[$theme].asset->url,
                "about": about[$locale],
                "positions": positions[]{
                    "name": name[$locale],
                    "description": description[$locale],
                    "skills": skills[]->{
                        name
                    } | order(priority desc),
                    duration,
                } | order(duration.from desc),
            } | order(positions[0].duration.from desc),
        },
        "projects": *[_type == "project"] {
            id, priority,
            "name": name[$locale],
            "thumbnail": thumbnail[$theme].asset->url,
            "stack": stack[]->{
                name, type, color, priority
            } | order(priority desc),
            "description": description[$locale]
        } | order(priority desc),
    }`)

    // каждая строка юридических пометок из CMS — отдельный комментарий в legal.conf
    const legalNotes = computed(() => (data.value?.footer?.legal || '').split('\n').map((line: string) => line.trim()).filter((line: string) => /[\p{L}\p{N}]/u.test(line.replace(/<[^>]*>/g, ''))))

    if (data.value) useSeoMeta({
        titleTemplate: chunk => `${data.value?.person?.title || ''}${chunk ? ` — ${chunk}` : ``}`,
        themeColor: config.theme.background[theme.value as 'dark' | 'light'],
    })

    if (data.value) useSchemaOrg([
        definePerson({
            name: config.schema.person.fullname,
            givenName: config.schema.person.firstname,
            familyName: config.schema.person.lastname,
            alternateName: config.schema.person.initials,
            image: data.value?.person?.image,
            description: data.value?.person?.description,
            jobTitle: config.schema.person.position,
            telephone: data.value?.person?.phone,
            email: data.value?.person?.email,
            url: config.head.url,
            sameAs: data.value?.person?.links,
            worksFor: defineOrganization({
                name: data.value?.person?.workplace?.name,
                url: data.value?.person?.workplace?.link,
                logo: data.value?.person?.workplace?.logo
            }),
            knowsAbout: data.value?.person?.skills?.flatMap((skill: any) => ({
                "@type": 'Thing',
                name: skill.name
            })) || [],
            hasOccupation: data.value?.person?.experience?.map((company: any) => company.positions?.map((position: any) => ({
                "@type": 'Occupation',
                name: position.name,
                description: company.about,
                responsibilities: position.description,
                skills: position.skills?.map((skill: any) => skill.name),
                startDate: position.duration?.from,
                endDate: position.duration?.to || undefined,
                organization: defineOrganization({
                    name: company.name,
                    url: company.link || undefined,
                    logo: company.logo || undefined
                })
            }))),
        }),
        defineItemList({
            name: 'Проекты',
            itemListElement: data.value?.projects?.sort((a: any, b: any) => b.priority - a.priority).map((project: any, index: number) => ({
                "@type": project.repo ? 'SoftwareSourceCode' : 'CreativeWork',
                position: index + 1,
                name: project.name,
                codeRepository: project.repo ? `https://github.com/${project.repo}` : undefined,
                url: `${config.head.url}/ru/projects/${project.id}`,
                thumbnailUrl: project.thumbnail,
                description: project.description
            }))
        }),
        defineOrganization({
            name: config.schema.organization.name,
            legalName: config.schema.organization.legalName,
            legalAddress: config.schema.organization.legalAddress,
            url: config.schema.organization.url,
            email: config.schema.organization.email,
            logo: config.schema.organization.logo,
            telephone: config.schema.organization.phone
        })
    ])
</script>

<template>
    <LazyOrganismsChatModal v-if="assistant.open.value" v-model:open="assistant.open.value"/>
    <OrganismsAssistantCat/>
    <NuxtHeader class="transition-colors duration-500" :ui="{ container: 'max-w-dvw', root: `${header >= scroll.y.value && 'border-bg!'} max-lg:border-default!` }">
        <template #left>
            <NuxtLink to="/" v-html="Logo" aria-label="xlsft" :prefetch="false"/>
        </template>
        <template #toggle>
            <!-- «Скачать» ведёт в ИИ-ассистента: он покажет файлы резюме (PDF, DOCX, Markdown) -->
            <NuxtButton variant="outline" color="neutral" icon="mingcute:download-2-line" class="max-w-8 justify-center" :aria-label="t('labels.download_cv')" :ui="{ leadingIcon: 'text-default!' }" @click="assistant.ask(t('ai.download_intent'))"></NuxtButton>
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
    <NuxtContainer class="flex flex-col min-h-(--ui-viewport-height) py-12 max-lg:p-0!">
        <div class="min-w-full min-h-full grow border max-lg:border-none relative flex flex-col">
            <div class="w-full" id="container"/>
            <main class="w-full h-full grow flex flex-col">
                <slot/>
            </main>
        </div>
    </NuxtContainer>
    <NuxtFooter :ui="{ container: 'lg:items-start!', right: 'lg:h-full! grow!', left: 'items-start! justify-start!s' }">
        <template #left>
            <!-- реквизиты как legal.conf: та же терминальная подача, что у заголовков секций и experience.conf -->
            <div class="legal flex flex-col gap-3 text-xs leading-5 max-w-160 w-full">
                <span aria-hidden="true" class="flex items-center gap-3">
                    <span class="text-primary">$</span>
                    <span class="text-default">cat</span>
                    <span class="text-success">legal.conf</span>
                </span>
                <dl class="legal-kv">
                    <dt>entity</dt><dd>{{ config.schema.organization.legalName }}</dd>
                    <dt>inn</dt><dd class="tabular-nums">{{ config.schema.organization.inn }}</dd>
                    <dt>ogrnip</dt><dd class="tabular-nums">{{ config.schema.organization.ogrn }}</dd>
                    <template v-if="data?.footer?.links?.length">
                        <dt>contacts</dt>
                        <dd>
                            <span class="text-dimmed">[</span><template v-for="(link, index) in data.footer.links" :key="link.to"><NuxtLink :to="link.to" target="_blank" class="text-xs! text-default/75!">{{ link.label.toLowerCase() }}</NuxtLink><span v-if="index < data.footer.links.length - 1" class="text-dimmed">, </span></template><span class="text-dimmed">]</span>
                        </dd>
                    </template>
                </dl>
                <div class="legal-notes flex flex-col gap-1" v-if="legalNotes.length">
                    <MDC v-for="note in legalNotes" :key="note" :value="note" class="md"/>
                </div>
            </div>
        </template>
        <template #right>
            <div class="flex flex-col items-end h-full gap-2 max-lg:items-center">
                <button type="button" aria-label="xlsft" class="cursor-pointer" @click="logoVariant = (logoVariant + 1) % 6"><AtomsLogo3d :variant="logoVariant as 0 | 1 | 2 | 3 | 4 | 5"/></button>
                <span class="text-xs text-(--ui-text-comment)"># {{ config.head.author }} @ {{ new Date().getFullYear() }}</span>
            </div>
        </template>
    </NuxtFooter>
</template>

<style scoped>
    .legal-kv {
        display: grid;
        grid-template-columns: 9ch 2ch minmax(0, 1fr);
        row-gap: 2px;
        margin: 0;
    }
    .legal-kv dt { grid-column: 1; position: relative; color: var(--ui-text-dimmed); }
    .legal-kv dt::after { content: "="; position: absolute; left: 9ch; color: var(--ui-border); }
    .legal-kv dd { grid-column: 3; margin: 0; min-width: 0; color: color-mix(in srgb, var(--ui-text) 75%, var(--ui-bg)); }

    /* юридические пометки из CMS — комментарии конфига */
    .legal-notes :deep(.md) { --legal-note: var(--ui-text-comment); color: var(--legal-note); }
    .legal-notes :deep(.md > *) { margin: 0 !important; padding-left: 2ch; position: relative; font-size: inherit !important; line-height: inherit !important; }
    .legal-notes :deep(.md > *::before) { content: "#"; position: absolute; left: 0; color: var(--legal-note); }
    .legal-notes :deep(strong) { font-weight: 400 !important; color: var(--legal-note); }
</style>
