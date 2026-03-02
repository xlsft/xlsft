<script setup lang="ts">
import { useScroll } from '@vueuse/core';

    // import Banner from '~/components/Banner.vue';
    // import EasterEgg from '../components/deprecated/EasterEgg.vue';
    // import Footer from '../components/deprecated/Footer.vue';
    // import Header from '../components/deprecated/Header.vue';
    // onMounted(() => {
    //     const script = document.createElement('script');
    //     script.src = "https://widget.ainedwork.ru/api/script";
    //     script.onload = () => {
    //         // @ts-ignore
    //         if (typeof Widget !== 'undefined') {
    //             // @ts-ignore
    //             new Widget('63cae867-f6d9-489f-af96-a063ff5a0a53', '9f618d20-412d-4a89-8310-fa94e12ddd9e').init();
    //             addEventListener('ained-ready', () => {
    //                 const element = document.getElementById('ained-widget') 
    //                 // @ts-ignore
    //                 if (element) window.ained.widget.create(element, 'node/1')
    //             })
    //         }
    //     };
    //     document.head.appendChild(script);
    // });




    const scroll = useScroll(document)
    const header = computed(() => window ? parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--ui-header-height')) : 0)
</script>

<template>
    <NuxtHeader class="transition-colors duration-500" :ui="{ container: 'max-w-dvw', root: `${header >= scroll.y.value && 'border-bg!'} max-lg:border-default!` }">
        <template #left>
            <AtomsLogo/>
        </template>
        <template #toggle>
            <MoleculesLocale/>
        </template>
    </NuxtHeader>
    <NuxtContainer class="flex flex-col min-h-(--ui-viewport-height) py-12 max-lg:p-0!">
        <div class="min-w-full min-h-full grow border max-lg:border-none relative flex flex-col">
            <AtomsCross class="absolute top-0 left-0 opacity-50 max-lg:hidden"/>
            <MoleculesSectionHeader pattern="topography"/>
            <div class="w-full h-full grow flex flex-col overflow-x-hidden">
                <slot/>
            </div>
        </div>
    </NuxtContainer>
</template>
