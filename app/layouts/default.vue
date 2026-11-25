<script setup lang="ts">
    import { useAssistantStore } from '~/stores/assistant'

    const assistantStore = useAssistantStore()
</script>

<template>
    <LayoutSeo/>
    <LazyAssistant v-if="assistantStore.open"/>
    <AssistantCat/>
    <LayoutHeader/>
    <NuxtContainer class="flex flex-col min-h-viewport py-12 max-lg:p-0!">
        <div class="min-w-full min-h-full grow border max-lg:border-none relative flex flex-col">
            <div id="container" class="w-full"/>
            <main class="size-full grow flex flex-col">
                <slot/>
            </main>
        </div>
    </NuxtContainer>
    <LayoutFooter/>
</template>
