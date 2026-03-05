<script setup lang="ts">

    import useMarkdownRemoval from 'remove-markdown'
    const props = withDefaults(defineProps<{
        theme?: 'dark' | 'light'
        project?: any
    }>(), { theme: 'dark' })
    const config = useRuntimeConfig().public.config

    const wide = (url: string) => url.includes('500x') || url.includes('501x') || url.includes('499x')
    
</script>

<template>
    <div 
        class="w-full h-full p-8" 
        :style="{ 
            background: props.theme === 'dark' ? config.theme.background.dark : config.theme.background.light, 
            color: props.theme === 'dark' ? config.theme.font.dark : config.theme.font.light,
            '--border-color-theme': (props.theme === 'dark' ? config.theme.border.dark : config.theme.border.light) + 80, 
            fontFamily: `'Cascadia Code', monospace` 
        }"
    >
        <div class="w-full h-full flex items-center justify-between border p-8 gap-16" style="border-color: var(--border-color-theme)">
            <div class="flex flex-col items-start h-full gap-4 relative">
                <h1 class="text-5xl font-black" style="text-wrap: pretty" v-if="project.name && !wide(project.logo)">{{ project.name }}</h1>
                <img :src="project.logo" class="h-12 object-contain" v-else-if="project.name && wide(project.logo)"/>
                <div class="absolute top-0 right-0 bg-blue-500 text-black px-4 py-2" v-if="project.status && wide(project.logo)">{{ project.status }}</div>

                <div class="text-xl flex flex-col" style="border-color: var(--border-color-theme)">
                    {{ useMarkdownRemoval(project.description) }}
                </div>
                <div class="inline-flex w-full h-full overflow-hidden flex-nowrap gap-0" :class="project.images.length === 1 && 'justify-center'" v-if="project.images.length">
                    <img :src v-for="src in project.images" class="h-full">
                </div>
                <div class="h-full flex flex-col justify-end align-bottom opacity-50 overflow-hidden text-ellipsis" v-else-if="project.copyright">
                    <p>{{ useMarkdownRemoval(project.copyright) }}</p>
                </div>
                
            </div>
            <div class="relative w-[30%]" v-if="project.logo && !wide(project.logo)">
                <img :src="project.logo" class="h-full w-full object-contain"/>
                <div class="absolute top-4 right-4 bg-blue-500 text-black px-4 py-2" v-if="project.status">{{ project.status }}</div>
            </div>
        </div>
    </div>
</template>