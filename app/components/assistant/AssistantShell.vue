<script setup lang="ts">
    const props = defineProps<{
        command: string
        loading?: boolean
        status?: string
    }>()
</script>

<template>
    <div class="flex w-full min-w-0 flex-col gap-2 text-xs/5 no-ligatures">
        <p class="m-0 flex min-w-0 items-center gap-ch">
            <CommonHighlight class="min-w-0 truncate" :text="`\0p$ ${props.command.replaceAll('\n', ' ')}`"/>
            <span v-if="props.loading" aria-hidden="true" class="h-4 w-ch shrink-0 animate-pulse bg-inverted motion-reduce:animate-none"/>
        </p>
        <div v-if="props.loading" class="flex min-h-5 items-center text-dimmed" role="status">
            <NuxtChatShimmer v-if="props.status" :text="props.status"/>
        </div>
        <slot v-else/>
    </div>
</template>
