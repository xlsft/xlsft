<script setup lang="ts">
    const state = ref<boolean | null>(null)

    const router = useRouter()

    onMounted(async () => {
        await new Promise(_ => setTimeout(_, 3000))
        if (localStorage.getItem('banner_pb_read')) state.value = false
        else state.value = true
    })

    const close = () => {
        localStorage.setItem('banner_pb_read', 'true')
        state.value = false
    }
</script>

<template>
    <div class="w-dvw max-lg:flex-col fixed bottom-0 left-0 flex items center z-[9] bg-black border-t! items-center justify-between max-sm:p-[12px] max-sm:gap-[12px] p-[24px] gap-[24px]" :class="`${state === null ? 'opacity-0! transition-none!' : 'duration-500 transition-opacity'} ${state === true ? 'opacity-100!' : 'opacity-0! pointer-events-none! *:pointer-events-none'}`">
        <div class="flex gap-[24px] max-sm:gap-[12px] items-center justify-center max-sm:flex-col max-sm:items-start">
            <img src="/pixelbattle-banner.svg" class="h-[24px] max-sm:h-[18px]">
            <p class="font-bold! text-pretty! max-w-[700px] leading-[18px] max-sm:leading-[12px] max-sm:text-left max-lg:text-right max-sm:text-xs!">Сражайтесь за полотно, стройте союзы, и просто веселитесь, ну и попробуйте сломать, буду рад если какой то фидбек будет</p>
        </div>
        <div class="flex gap-[12px] items-center justify-center max-lg:w-full">
            <button mini class="max-lg:grow max-sm:text-sm!" @click="router.push('/pixelbattle')">Попробовать</button>
            <button mini black class="max-lg:grow max-sm:text-sm!" @click="close">Не интересно</button>
        </div>
    </div>
</template>

<i18n>

</i18n>