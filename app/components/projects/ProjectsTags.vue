<script setup lang="ts">
    import { useProjectsStore } from '~/stores/projects'

    const projectsStore = useProjectsStore()
</script>

<template>
    <div class="grid grid-cols-tags gap-px border-b border-default bg-border">
        <button
            v-for="tag in projectsStore.tags"
            :key="tag"
            type="button"
            :aria-pressed="projectsStore.active.includes(tag)"
            :disabled="!projectsStore.counts.has(tag)"
            class="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 bg-default px-1 text-sm/tight text-default focus-visible:-outline-offset-2 disabled:text-dimmed aria-pressed:bg-inverted aria-pressed:text-inverted"
            @click="projectsStore.toggle(tag)"
        >
            {{ tag }}<span class="text-xs leading-none tabular-nums opacity-65">{{ projectsStore.pad(projectsStore.counts.get(tag) ?? 0) }}</span>
        </button>
    </div>
</template>
