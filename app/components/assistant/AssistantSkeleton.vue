<script setup lang="ts">
    const props = withDefaults(defineProps<{
        variant?: 'list' | 'groups' | 'buttons' | 'text'
    }>(), { variant: 'text' })

    const bar = 'block animate-skeleton bg-elevated motion-reduce:animate-none'
</script>

<template>
    <div class="border" aria-hidden="true">
        <template v-if="props.variant === 'list'">
            <div v-for="row in 2" :key="row" class="flex flex-col gap-2 p-3" :class="row > 1 && 'border-t'">
                <span :class="bar" class="h-4 w-28"/>
                <span :class="bar" class="h-3 w-2/3"/>
                <span class="flex gap-1"><span :class="bar" class="h-5 w-10"/><span :class="bar" class="h-5 w-12"/><span :class="bar" class="h-5 w-9"/></span>
            </div>
        </template>
        <template v-else-if="props.variant === 'groups'">
            <div v-for="row in 3" :key="row" class="flex flex-col gap-2 p-3" :class="row > 1 && 'border-t'">
                <span :class="bar" class="h-3 w-16"/>
                <span class="flex gap-1"><span :class="bar" class="h-5 w-10"/><span :class="bar" class="h-5 w-14"/><span :class="bar" class="h-5 w-9"/><span :class="bar" class="h-5 w-12"/></span>
            </div>
        </template>
        <div v-else-if="props.variant === 'buttons'" class="flex gap-2 p-3">
            <span v-for="item in 3" :key="item" :class="bar" class="h-8 w-24"/>
        </div>
        <div v-else class="flex flex-col gap-2 p-3">
            <span :class="bar" class="h-4 w-40"/>
            <span :class="bar" class="h-3 w-3/4"/>
            <span :class="bar" class="h-3 w-1/2"/>
        </div>
    </div>
</template>
