<script setup lang="ts">

    const { t } = useI18n()

    const description = ref<HTMLTextAreaElement>()

    const form = ref<{ name?: string, description?: string, contact?: string }>({
        name: undefined,
        description: undefined,
        contact: undefined,
    })
    const sended = ref(false)

    const telegram = () => {
        window.open('https://t.me/xlsft_cv_bot', '_blank')
        ;(window as any).ym(103237740,'reachGoal','go_tg')
    }

    const send = async () => {
        await useFetch('api/form', { method: 'post', body: form.value })
        sessionStorage.setItem('sended', Date.now().toString())
        sended.value = true
        ;(window as any).ym(103237740,'reachGoal','send_form')
    }

    const disabled = computed(() => !form.value.name || !form.value.description || !form.value.contact)
    

    onMounted(() => {
        sended.value = sessionStorage.getItem('sended') !== null
        if (description.value) description.value.value = ''
    })
    
</script>

<template>
    <SectionHeader id="contact_me"  style="background-image: url('/patterns/hideout.svg');" hover-style="background-image: url('/patterns/hideout-hover.svg');"/>
    <section class="flex flex-col gap-[12px]" v-if="!sended">

        <label>
            {{ t('contact.company_name') }}
            <input v-model="form.name" :placeholder="t('contact.company_name_placeholder')">
        </label>

        <label>
            {{ t('contact.company_info') }}
            <textarea ref="description" @input="(e) => form.description = (e.target as HTMLInputElement).value" :placeholder="t('contact.company_info_placeholder')"></textarea>
        </label>

        <label>
            {{ t('contact.contacts') }}
            <input v-model="form.contact" :placeholder="t('contact.contacts_placeholder')">
        </label>

        <p class="text-xs! *:text-xs!" v-html="t('contact.accept_policy')"></p>

        <div class="flex flex-wrap gap-[12px] justify-start flex-row-reverse">
            <button black class="grow" :disabled @click="send">{{ t('contact.submit_form') }}</button>
            <button class="grow" @click="telegram">{{ t('contact.via_telegram') }}</button>
        </div>
    </section>
    <section v-else>
        <div class="flex flex-col gap-[24px]">
            <h1>{{ t('contact.thanks') }}</h1>
            <h3>{{ t('contact.i_contact_you') }}</h3>
        </div>
    </section>
</template>