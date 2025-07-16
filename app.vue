<script setup lang="ts">
    import EasterEgg from './components/EasterEgg.vue';
    import Footer from './components/Footer.vue';
    import Header from './components/Header.vue';
    onMounted(() => {
        const script = document.createElement('script');
        script.src = "https://widget.ainedwork.ru/api/script";
        script.onload = () => {
            // @ts-ignore
            if (typeof Widget !== 'undefined') {
                // @ts-ignore
                new Widget('63cae867-f6d9-489f-af96-a063ff5a0a53', '9f618d20-412d-4a89-8310-fa94e12ddd9e').init();
                addEventListener('ained-ready', () => {
                    const element = document.getElementById('ained-widget') 
                    // @ts-ignore
                    if (element) window.ained.widget.create(element, 'node/1')
                })
            }
        };
        document.head.appendChild(script);
    });
</script>

<template>
    <div id="app">
        <EasterEgg/>
        <Header/>
        <NuxtPage/>
    </div>
    <Footer/>
</template>
