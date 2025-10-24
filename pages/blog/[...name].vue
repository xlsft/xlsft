<script setup lang="ts">
    import Contact from '~/components/blocks/Contact.vue'

    const route = useRoute()
    const { data } = await useAsyncData(() => queryCollection('content').path(`/${route.params.name}`).first())
    if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
    useSeoMeta({ title: data.value?.title, description: data.value?.description })

    onMounted(() => document.body.scrollTo({ top: 0, behavior: 'smooth' }))
</script>

<template>
    <section class="flex flex-wrap items-center justify-between">
        <div class="flex flex-col gap-[12px] my-[48px] max-w-[40%]">
            <div class="text-4xl! font-black">{{ data?.title }}</div>
            <div class="text-xl!">{{ data?.description }}</div>
            <br>
            <div>
                <pre class="opacity-50">{{ JSON.stringify(data?.meta, null, 4) }}</pre>
            </div>
        </div>
        <img :src="(data?.meta?.image as string)" :alt="data.title" v-if="data" class="w-[500px] border"/>
    </section>
    <ContentRenderer v-if="data" :value="data" class="mdc"/>
    <Contact/>
</template>

<style>
    @import '~/assets/css/main.css';

    .mdc {
        @apply w-full pb-[24px] border-b;
        /* Заголовки */
        h1, h2, h3, h4, h5, h6 {
            @apply font-bold leading-snug px-[24px];
        }
        h1 { @apply text-3xl! pb-2 mt-[24px]; }
        h2 { @apply text-2xl! pb-1 mt-[24px]; }
        h3 { @apply text-xl! mt-[12px]; }
        h4 { @apply text-lg! mt-[12px]; }
        h5, h6 { @apply text-base!; }

        /* Параграфы */
        p { @apply px-[24px] pt-[24px]; }

        /* Списки */
        ul, ol { @apply my-4 pl-6; }
        li + li { @apply mt-1; }
        ul ul, ol ol { @apply mt-1; }

        /* Task list */
        input[type="checkbox"] { @apply mr-2 accent-blue-500; }

        /* Цитаты */
        blockquote {
            @apply border-l-4  pl-4 py-2 my-6 italic;
        }

        /* Код */
        code {
            @apply px-1 py-0.5 text-sm! font-mono outline-[1px] outline-accent! *:text-white! text-white! bg-accent/10;
        }

        pre {
            @apply overflow-x-auto my-6 text-sm! outline-[1px] outline-accent p-[24px] bg-accent/10;
            code {
                @apply bg-transparent text-inherit p-0 outline-0!;
            }
        }

        /* Таблицы */
        table {
            @apply border-collapse mx-[24px] w-[calc(100%-48px)] text-sm! my-[12px];
            th, td { @apply border px-3 py-2 text-left; }
            th { @apply font-semibold; }
        }

        /* Горизонтальные линии */
        hr { @apply border-t my-8; }

        /* Изображения */
        img { @apply max-w-full my-4 border max-w-[50dvh]!; }

        /* Сноски */
        sup { @apply text-xs! align-super; }


        /* Emoji */
        :is(span.emoji, img.emoji) { @apply align-middle h-[1.1em]; }

        /* Скролл при якорях */
        h2[id], h3[id] { @apply scroll-mt-24; }
    }
</style>