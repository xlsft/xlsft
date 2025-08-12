<script setup lang="ts">
import Banner from './Banner.vue'


    const { t, locale, setLocale } = useI18n()
    const router = useRouter()
    const route = useRoute()


    const pos = ref(0)
    onMounted(() => { 
        const body = document.querySelector('body')
        body?.addEventListener('scroll', (e) => {
            pos.value = body.scrollTop
        })
    })

    const modal = ref(false)

    const menu = ref<string[]>(['about', 'experience', 'contact_me', 'projects'])
    
    const goto = (e: MouseEvent) => {
        e.preventDefault()
        const query = new URL((e.target as HTMLAnchorElement).href).hash
        if (route.path === '/') router.push({ hash: query }); else router.push({ hash: query, path: '/' })
        let top = ((document.querySelector(query) as HTMLElement | null)?.offsetTop || 96) - 48; if (top === 48) top = 0
        document.body.scrollTo({ top, behavior: 'smooth' })
    }

    const print = () => window.print()

</script>

<template>
    <header :data-floating="pos >= 48">
        <img src="/logo.svg" class="h-[24px] hover:opacity-75 cursor-nw-resize!" @click="router.push('/')">
        <div class="w-full items-center justify-end gap-[12px] hidden lg:flex">
            <a :href="`#${item}`" @click="goto" v-for="item in menu">{{ t(`menu.${item}`) }}</a>
            <a :href="`https://github.com/xlsft`" target="_blank">Git</a>
            <a :href="`https://t.me/xlsft_cv_bot`" target="_blank">Telegram</a>
            <button black mini class="ml-[24px]" @click="print">{{ t('print') }}</button>
            <button black mini @click="setLocale(locale === 'ru' ? 'en' : 'ru')">{{ locale === 'ru' ? 'English version' : 'Русская версия' }}</button>
            
        </div>

        <button class="flex lg:hidden rounded-none! w-[24px]! px-0! opacity-0!" @click="modal = !modal"></button>

        <img src="/icons/o.svg" class="flex lg:hidden pointer-events-none absolute z-999 right-[24px] data-[modal=true]:rotate-90 rotate-0 duration-500 data-[modal=true]:opacity-0" :data-modal="modal">
        <img src="/icons/x.svg" class="flex lg:hidden pointer-events-none absolute z-999 right-[24px] -rotate-90 data-[modal=true]:rotate-0 duration-500 data-[modal=true]:opacity-100 opacity-0" :data-modal="modal">
        
        <Teleport to="body">
            <div class="print:hidden w-dvw h-dvh z-99 bg-black/75 absolute top-0 left-0 data-[modal=true]:opacity-100 opacity-0 data-[modal=true]:pointer-events-auto pointer-events-none group flex flex-col items-center justify-center gap-[12px]" :data-modal="modal">
                <a :href="`#${item}`" @click="(e) => { goto(e); modal = false }" v-for="item in menu" class="text-2xl! opacity-100!">{{ t(`menu.${item}`) }}</a>
                <a :href="`https://github.com/xlsft`" target="_blank" class="text-2xl! opacity-100!">Git</a>
                <a :href="`https://t.me/xlsft_cv_bot`" target="_blank" class="text-2xl! opacity-100!">Telegram</a>
                <button black mini class="absolute bottom-[48px]" @click="() => { setLocale(locale === 'ru' ? 'en' : 'ru'); modal = false }">{{ locale === 'ru' ? 'English version' : 'Русская версия' }}</button>
                <button black mini class="absolute bottom-[96px]" @click="print">{{ t('print') }}</button>
            </div>
        </Teleport>
    </header>
</template>