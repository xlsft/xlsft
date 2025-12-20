<script setup lang="js">
    import bytes from 'bytes'
    const open = () => window.open('https://proxy.xlsft.ru', '_blank')

    const stats = await (await fetch('https://proxy.xlsft.ru/api/config/stats')).json()
</script>

<template>
    <section class="flex group items-center justify-between bg-accent/10 border-accent! overflow-hidden">
        <div class="flex flex-col gap-6">
            <div class="flex flex-col">
                <div class="flex items-center gap-4">
                    <img src="/logo/proxy.svg" class="h-12">
                    <h2 class="text-nowrap">xlsft`s proxy</h2>
                </div>
                <span>Самый традиционный прокси-сервис! Попробуй сейчас!</span>
            </div>
            <div v-if="stats?.data" class="px-2 py-1 text-xs w-fit border border-accent! text-nowrap font-bold text-accent! bg-accent/10">Онлайн: {{ stats?.data?.online }}/{{ stats?.data?.clients }}; Трафик: {{ bytes(stats?.data?.total) }}</div>
        </div>
        <div class="max-h-[40px] items-start justify-center grow lg:flex hidden">
            <img src="/phone.png" class="object-contain w-full h-full max-w-[500px] -translate-y-40 -translate-x-20">
        </div>
        <button @click="open">Попробовать</button>
    </section>
</template>