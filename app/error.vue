<script setup lang="ts">
    import type { NuxtError } from '#app';
    const props = defineProps({ error: Object as () => NuxtError })

    const { data: seo } = await useSanityDynamicQuery<any>(groq`*[_type == "summary"][0]{
        "title": title[$locale],
        "description": description[$locale]
    }`)

    useRobotsRule({ noindex: true })
    
    useSeoMeta({
        titleTemplate: chunk => `${seo.value.title || ''}${chunk ? ` — ${chunk}` : ``}`,
        title: `[${props.error?.status}] ${props.error?.message}`,
        description: seo.value.description,
        ogTitle: `${seo.value.title} — [${props.error?.status}] ${props.error?.message}`,
        ogDescription: seo.value.description
    })
</script>

<template>
    <div class="error">
        <h1>{{ error?.statusCode }}</h1>
        <span>{{ error?.message }}</span>
        <NuxtButton size="xl" @click="clearError({ redirect: '/' })">return '/'</NuxtButton>
    </div>
</template>

<style>
    .error {
        width: 100dvw;
        height: 100dvh;
        gap: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.4s ease-in-out;
        h1 {
            font-size: 128px !important;
        }
        span {
            opacity: 50% !important;
            position: absolute;
            bottom: 24px; right: 24px;
        }
    }
</style>