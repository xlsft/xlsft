<script setup lang="ts">
    const { t } = useI18n()
    const current = ref('ained')
    const experience = [
        { id: 'xls' },
        { id: 'ained' },
        { id: 'briskly' }
    ]
</script>

<template>

    <SectionHeader id="experience" style="background-image: url('/patterns/architect.svg');" hover-style="background-image: url('/patterns/architect-hover.svg');"/>

    <section class="p-0! min-h-[48px] flex sm:flex-row flex-col gap-[1px]" style="background-image: url('/patterns/texture.svg');">
        <div class="relative h-[48px] grow flex items-center justify-center border-r last:border-none hover:outline-1 outline-blue-500! data-[active=true]:bg-black data-[active=true]:outline-1 cursor-nw-resize! group mask-radial-at-left after:opacity-50 after:ml-[8px]" @click="current = item.id" v-for="item in experience" :data-active="item.id === current">
            {{ t(`exp.${item.id}.title`) }}
        </div>
    </section>
    
    <section>
        <div class="h-fit flex justify-between gap-[24px] xl:gap-[48px] flex-col xl:flex-row">
            <div class="flex flex-col">
                <img class="h-[72px] w-fit mb-[24px]" :src="`/logo/${current}.svg`">
                <p class="text-sm opacity-75" v-html="t(`exp.${current}.history`)"></p>
            </div>
            <div class="flex flex-col min-w-[300px]">
                <span class="text-lg">{{ t(`exp.${current}.position`) }}</span>
                <span class="text-md opacity-75">{{ t(`exp.${current}.duration`) }}</span>
                <a v-if="current !== 'xls'" target="_blank" ref="noreferrer" :href="t(`exp.${current}.more_link`)">{{ t(`exp.${current}.more_label`) }}</a>
            </div>
        </div>
        <h3 class="mt-[24px]">{{ t('job_description') }}</h3>
        <p class="mt-[24px]" v-html="t(`exp.${current}.job`)"></p>
    </section>

</template>