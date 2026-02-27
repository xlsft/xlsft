<script setup lang="ts">
    import Badge from '~/components/atoms/Badge.vue';

    const { data: skills } = await useSanityQuery(groq`
        *[_type == "skill"]{
            name,
            color
        }
    `)
</script>

<template>
    <Badge  v-for="(skill, index) in skills" :key="index" :color="skill.color">
         {{ skill.name }}
    </Badge>
</template>