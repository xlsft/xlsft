<script setup lang="ts">

    import DDD from "./global/DDD.vue"
    import Debug from "./global/Debug.vue"

    const { t } = useI18n()
    
    const debug = ref(false)
    const clicks = ref(0)

</script>

<template>
    <footer>
        <p class="opacity-50 *:text-[10px]! text-[10px]! leading-[14px] sm:max-w-[400px] text-center sm:text-left">
            
            ИП Торшин Илья Евгеньевич ОГРНИП 323480000011992 ИНН 482308004814<br>
            <a target="_blank" href="https://t.me/xlsfotware">Telegram</a>&nbsp;
            <a target="_blank" href="https://vk.com/xlsfotware">VK</a>&nbsp;
            <a target="_blank" :href="`mailto:dev@xlsoftware.ru?subject=${t('mailto_subject')}`">Mail</a>&nbsp;
            <a target="_blank" :href="`https://github.com/xlsft`">Git</a>&nbsp;
            <br><br>
            Торговая марка «Briskly» №848501 является собственностью ООО «БРИСКЛИ» ОГРН 1187746690768 ИНН 9701114958<br>
            Торговая марка «AINED» №903277 является собственностью ООО «ЦИФРОВАЯ НЕДВИЖИМОСТЬ» ОГРН 1214800006035 ИНН 4826148336<br><br>
            <DDD/>
            <Debug v-model="debug" v-model:clicks="clicks"/>
        </p>
        <div class="flex sm:flex-col sm:justify-between sm:items-end flex-row justify-between items-center">
            <img :src="`${clicks > 5 ? '/logo-mini-debug.svg' : '/logo-mini.svg'}`" class="w-[24px] cursor-help!" :style="`transform: scale(${clicks > 5 ? 1 : Math.min(clicks / 10 + 1, 1.5)})`" @click="clicks++"> 
            <span class="text-[10px]! opacity-50">XL Software @ {{ new Date().getFullYear() }}</span>
        </div>
    </footer>
</template>