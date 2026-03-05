<script setup lang="ts">
    import * as wv from 'web-vitals/attribution'

    const vitals = ref<Record<string, any>>({})


    onMounted(() => {
        wv.onCLS(console.info)
        wv.onFCP(console.info)
        wv.onINP(console.info)
        wv.onLCP(console.info)
        wv.onTTFB(console.info)
    })
</script>

<template>
    <NuxtApp>
        <NuxtLoadingIndicator color="#2B7FFF"/>
        <NuxtLayout>
            <NuxtPage/>
        </NuxtLayout>
    </NuxtApp>
</template>
