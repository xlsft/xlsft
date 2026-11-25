<script setup lang="ts">
    const props = withDefaults(defineProps<{
        name: string
        title?: string
        heading?: string
        contact?: boolean
    }>(), { contact: true })
</script>

<template>
    <section :id="props.name" class="border-t-8 border-default first:border-t-0">
        <header class="flex items-center justify-between gap-4 border-b border-default px-6 py-4 sm:p-4 lg:px-8 lg:py-6">
            <div class="flex min-w-0 flex-1 flex-col gap-1 sm:gap-3">
                <div class="flex min-w-0 items-center gap-3 text-base">
                    <h2 v-if="props.heading" class="text-xl! font-bold sm:text-base! sm:font-normal! sm:text-dimmed">{{ props.heading }}</h2>
                    <slot name="title">
                        <CommonHighlight v-if="props.title" :text="props.title" class="text-base/relaxed max-sm:text-compact" :class="props.heading && 'max-sm:hidden'"/>
                    </slot>
                </div>
                <slot name="detail"/>
            </div>
            <slot name="actions">
                <CommonContact v-if="props.contact" class="shrink-0 max-sm:hidden!"/>
            </slot>
        </header>
        <slot/>
    </section>
</template>

