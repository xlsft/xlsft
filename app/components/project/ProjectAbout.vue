<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        id: string
    }>()
    const { t } = useI18n()
    const cmsStore = useCmsStore()

    const { data } = await cmsStore.about(() => props.id)

    const groups = computed<{ type: string, items: Pick<Skill, 'name' | 'type'>[] }[]>(() => cmsStore.group(data.value?.stack?.map((item) => ({ ...item, type: item.type || 'other' }))))
    const title = computed<string>(() => [
        data.value?.about && '\0ocat \0sabout.md',
        groups.value.length && '\0obat \0sstack.tsv',
    ].filter(Boolean).join('\0d && '))
</script>

<template>
    <LayoutSection v-if="data?.about || groups.length" name="about" :title="`\0d~/projects/${props.id} \0p$ ${title}`" :contact="false">
        <div class="flex flex-col gap-px bg-border lg:flex-row">
            <article v-if="data?.about" class="flex min-w-0 flex-1 flex-col gap-4 bg-default p-8 max-sm:p-4">
                <h2 class="text-lg! leading-6.5">{{ t('sections.about_project') }}</h2>
                <MDC :value="data.about" class="md max-w-prose overflow-x-auto text-sm/5.5"/>
                <p v-if="data.copyright" class="text-sm text-comment"># {{ data.copyright }}</p>
            </article>

            <div
                v-if="groups.length"
                id="stack"
                class="relative flex min-w-0 shrink-0 scroll-mt-24 items-start bg-default before:pointer-events-none before:absolute before:inset-y-0 before:left-gutter before:-ml-px before:w-px before:bg-border max-sm:before:left-gutter-sm lg:w-85"
            >
                <CommonTSV :label="t('labels.stack')" :rows="groups.map((group) => ({ type: group.type, items: group.items.map((item) => item.name) }))" sticky/>
            </div>
        </div>
    </LayoutSection>
</template>

