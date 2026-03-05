<script setup lang="ts">
    import useMarkdownRemoval from 'remove-markdown'
    const route = useRoute()

    const params = ref({ id: route.params.id?.toString() }); watch(() => route.params.id, () => params.value.id = route.params.id?.toString())
    const { data } = await useSanityDynamicQuery<any>(groq`*[_type == "legal" && id == $id] {
        "seo": *[_type == "summary"][0] {
            "title": title[$locale], 
        },
        "title": title[$locale],
        "description": description[$locale],
        "content": description[$locale],
    }[0]`, params);

    if (!data.value) throw createError({ status: 404, message: `"${route.params.id?.toString()}" Document not found` })

    useSeoMeta({
        title: data.value?.title,
        ogTitle: `${data.value?.seo.title} — ${data.value?.title}`,
        description: useMarkdownRemoval(data.value?.description),
        ogDescription: useMarkdownRemoval(data.value?.description)
    })
</script>

<template>
    {{ data }}
</template>