<script setup lang="ts">
    const props = defineProps<{ pattern: string, id?: string, noContact?: boolean }>()
</script>

<template>
    <AtomsPattern 
        :name="props.pattern" 
        :id 
        style="break-before: page;"
        class="w-full py-12 outline group/header hover:outline-blue-500! print:border print:outline-0 transition-colors z-2 flex items-center px-8 max-lg:flex-col gap-4 max-lg:py-4 max-lg:px-0 print:p-0! print:items-center! print:justify-center!" 
        :class="[
            $slots.default ? 'min-h-32' : 'min-h-18',
            props.noContact ? 'justify-center' : 'justify-between!'
        ]"
    >
        <h2 class="max-lg:text-center bg-default py-3 px-6 border group-hover/header:border-blue-500! text-2xl! font-bold z-3 pointer-events-none" v-if="$slots.default">
            <slot/>
        </h2>
        <OrganismsContactButton class="z-3" :id v-if="$slots.default && !props.noContact"/>
    </AtomsPattern>
</template>