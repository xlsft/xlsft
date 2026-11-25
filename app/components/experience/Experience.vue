<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        collapsible?: boolean
    }>()

    const cmsStore = useCmsStore()

    const { data } = await cmsStore.experience()

</script>

<template>
    <LayoutSection
        v-if="data?.length"
        name="experience"
        heading="~/experience"
        :title="`\0p$ \0oecho \0i&quot;(\0w$DURATION\0i)&quot; \0d&& \0ocat \0sexperience.conf`"
    >
        <template #detail>
            <span class="text-sm! text-default/50">({{ cmsStore.span(data.at(-1)?.positions.at(-1)?.duration.from ?? new Date(), data.at(0)?.positions.at(0)?.duration.to).duration() }})</span>
        </template>
        <div class="p-8 max-lg:p-4 flex flex-col relative">
            <ExperienceItem
                v-for="(company, index) in data"
                :key="company.name"
                :company
                :number="String(data.length - index - 1).padStart(2, '0')"
                :last="index === data.length - 1"
                :collapsible="props.collapsible"
            />
        </div>
    </LayoutSection>
</template>

