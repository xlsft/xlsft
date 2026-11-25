<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'
    import { useProjectsStore } from '~/stores/projects'

    const props = defineProps<{
        exclude?: string
    }>()

    const { locale } = useI18n()
    const router = useRouter()
    const cmsStore = useCmsStore()
    const projectsStore = useProjectsStore()

    const { data } = await cmsStore.projects()
    const { data: colors } = await cmsStore.colors(() => (data.value ?? []).map((project) => project.logo))

    function open(id: string): void {
        router.push(`/${locale.value}/projects/${id}`)
    }

    watch(() => [data.value, props.exclude] as const, ([list, exclude]) => {
        projectsStore.items = (list ?? []).filter((project) => project.id !== exclude)
    }, { immediate: true })
</script>

<template>
    <LayoutSection v-if="projectsStore.items.length" name="projects" heading="~/projects">
        <template #title>
            <ProjectsPrompt v-if="projectsStore.tags.length" class="max-sm:hidden"/>
        </template>
        <template #detail>
            <ProjectsOutput v-if="projectsStore.tags.length" class="max-sm:hidden"/>
        </template>
        <ProjectsTags v-if="projectsStore.tags.length" class="sm:hidden"/>
        <ProjectsGrid :projects="projectsStore.sorted" :colors="colors ?? undefined" @open="open"/>
    </LayoutSection>
</template>
