<script setup lang="ts">
    import About from '~/components/blocks/About.vue';
    import Blog from '~/components/blocks/Blog.vue';
    import Projects from '~/components/blocks/Projects.vue';
    import Contact from '~/components/blocks/Contact.vue';
    import Experience from '~/components/blocks/Experience.vue';

    import Proxy from '~/components/blocks/Proxy.vue';
    
    onMounted(() => {
        const lang = useRoute().query.lang?.toString() || 'ru'
        if (['en','ru'].includes(lang)) useI18n().setLocale(lang as any)
    })
</script>

<template>

    <About/>
    <Proxy/>
    <Experience/>
    <Projects/>
    <Blog/>
    <Contact/>
    
</template>