<script setup lang="ts">
    import { useUUID } from '@xlsft/nuxt';
    import { io } from 'socket.io-client';
    import type { TelegramAuthUser } from '~/types/telegram.types';

    const model = defineModel<TelegramAuthUser>()
    const uuid = ref()
    const socket = io()
    const loading = ref(false)

    let interval: NodeJS.Timeout

    const polling = () => {
        interval = setInterval(async () => {
            socket.emit('pb:user', uuid.value); socket.on('pb:user:response', (data) => {
                if (!data) return
                localStorage.setItem('user_cache', JSON.stringify(data))
                model.value = data
                clearInterval(interval)
                loading.value = false
            })
        }, 2000)
    }

    onMounted(() => {
        const saved = localStorage.getItem('user_uuid')
        uuid.value = saved ? saved : useUUID()
        if (!saved) localStorage.setItem('user_uuid', uuid.value)
        const cached = localStorage.getItem('user_cache')
        if (cached) model.value = JSON.parse(cached)
        else polling()
    })

    const login = () => {
        if (loading.value) return
        loading.value = true
        window.open(`https://t.me/xlsft_cv_bot?start=login--${uuid.value}`, '_blank')
    }

    const { t } = useI18n()
</script>

<template>
    <button @click="login" :class="loading ? 'animate-pulse' : ''">{{ t('login') }}</button>
</template>

<i18n>
    {
        "ru": {
            "login": "Войти с помощью Telegram"
        },
        "en": {
            "login": "Login with Telegram"
        }
    }
</i18n>