<script setup lang="ts">
    const { data } = await useAsyncData(() => queryCollection('content').all())
    const { t } = useI18n()
    const router = useRouter()
</script>

<template>
    <SectionHeader id="blog" class="print:hidden" style="background-image: url('/patterns/x-equals.svg');" hover-style="background-image: url('/patterns/x-equals-hover.svg');"/>
    <section class="grid gap-[24px] grid-cols-3">
        <div class="border hover:opacity-50 cursor-nw-resize!" @click="router.push(`/blog${item.path}`)" v-if="data" v-for="item in data.map(v => ({ ...v, body: undefined }))">
            <img :src="(item.meta.image as string)" class="w-full aspect-video border-b"/>
            <div class="flex flex-col p-[12px] gap-[8px]">
                <div class="font-bold">{{ item.title }}</div>
                <div class="text-xs! opacity-50">{{ item.description }}</div>
                <div class="flex items-center justify-between opacity-50">
                    <span class="text-xs!">{{ item.meta.author }}</span>
                    <span class="text-xs!">{{ t('read_time') }}: {{ item.meta.read_time }}m</span>
                </div>
            </div>
        </div>
    </section>
</template>

<i18n>
    {
        "ru": {
            "read_time": "Время чтения"
        },
        "en": {
            "read_time": "Read time"
        },
    }
</i18n>