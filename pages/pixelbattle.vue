<script setup lang="ts">
    import PixelBattle from '~/components/global/PixelBattle.vue';
    definePageMeta({ layout: 'blank' }); useSeoMeta({ 
        title: 'xlsft`s pixel battle',
        description: 'Сражайтесь за полотно, стройте союзы, и просто веселитесь, ну и попробуйте сломать, буду рад если какой то фидбек будет',
        ogDescription: 'Play now!',
        ogTitle: 'xlsft`s pixel battle',
        ogUrl: 'https://xlsft.ru/pixelbattle',
        ogImage: '/og_image_pb.png'
    })
</script>

<template>
    <PixelBattle/>
</template>