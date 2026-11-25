<script setup lang="ts">
    import { useProjectsStore } from '~/stores/projects'

    const { t } = useI18n()
    const projectsStore = useProjectsStore()
</script>

<template>
    <div class="flex h-6 shrink-0 items-center gap-3 overflow-x-auto overflow-y-hidden text-sm whitespace-nowrap no-ligatures">
        <p v-if="projectsStore.error" class="shrink-0 text-error" role="alert">{{ projectsStore.error }}</p>
        <p v-else-if="projectsStore.help" class="shrink-0 text-dimmed" role="status">{{ t('labels.terminal_help') }}</p>
        <div v-else-if="projectsStore.menu.length" class="flex shrink-0 items-center gap-4">
            <button
                v-for="item in projectsStore.menu"
                :key="item.tag"
                type="button"
                class="flex items-baseline gap-1.5 p-0 text-success underline-offset-4 transition-colors hover:underline"
                :class="item.tag === projectsStore.completion && 'underline'"
                @click.stop="projectsStore.pick(item.tag)"
            >
                {{ item.tag }}<span class="text-xs text-dimmed">{{ projectsStore.pad(item.count) }}</span>
            </button>
        </div>
    </div>
</template>
