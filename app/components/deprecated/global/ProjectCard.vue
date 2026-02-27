<script setup lang="ts">
    import { usePureClick } from '@xlsft/nuxt';

    const container = ref<HTMLElement | null>(null)
    usePureClick(container, () => {
        window.open(props.link, '_blank')
    })
    
    const props = defineProps<{ id: string, link: string, tags: string[] }>()
    const { t } = useI18n()
    const router = useRouter()
</script>

<template>
    
    <div class="group flex flex-col overflow-hidden border cursor-nw-resize! *:cursor-nw-resize! hover:border-blue-500! group w-[300px] min-w-[300px] h-[calc(400px-96px)] my-[48px] mr-[24px] first:ml-[48px] last:mr-[48px]" ref="container">
        <img :src="`/projects/${props.id}.webp`" class="w-full grayscale-100 group-hover:grayscale-0">
        <div class="flex px-[24px] pb-[24px] flex-col justify-between grow">
            <span class="text-xs! opacity-50">{{ t(`project.${props.id}.description`) }}</span>
            <div class="flex flex-wrap gap-[4px]">
                <div class="text-xs! px-[8px] py-[2px] border" v-for="tag in props.tags">{{ tag }}</div>
            </div>
        </div>
    </div>
</template>