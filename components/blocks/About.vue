<script setup lang="ts">

    const router = useRouter()
    const { t, locale } = useI18n()

    const now = ref(new Date())
    onMounted(() => {
        now.value = new Date()
        setInterval(() => {
            now.value = new Date()
        }, 1000)
    })

    const params = computed(() => { return {
        now: now.value.toLocaleString(locale.value),
        name: t('name'),
        bd: new Date(2003, 7, 1).toLocaleDateString(locale.value),
        age: (() => {
            const today = new Date();
            const bd = new Date(2003, 7, 1);
            let age = today.getFullYear() - bd.getFullYear();
            const m = today.getMonth() - bd.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
            age--;
            }
            return age;
        })(),
        sex: 'male',
        loc: 'Russia, Lipetsk, (GMT +3)',
    }})

    const params_length = computed(() => new TextEncoder().encode(JSON.stringify(params.value, null, 4)).length)

    const badges: { color: string, name: string }[] = [
        { color: 'var(--color-green-500)', name: 'vue' },
        { color: 'var(--color-green-600)', name: 'nuxt' },
        { color: 'var(--color-blue-500)', name: 'react' },
        { color: 'var(--color-blue-600)', name: 'next' },
        { color: 'var(--color-orange-500)', name: 'svelte' },
        { color: 'var(--color-orange-600)', name: 'sveltekit' },
        { color: 'var(--color-blue-500)', name: 'tailwind' },
        { color: 'var(--color-purple-500)', name: 'scss' },
        { color: 'var(--color-lime-600)', name: 'node.js' },
        { color: 'var(--color-neutral-400)', name: 'deno' },
        { color: 'var(--color-yellow-500)', name: 'js' },
        { color: 'var(--color-blue-700)', name: 'ts' },
        { color: 'var(--color-neutral-400)', name: 'rest' },
        { color: 'var(--color-pink-500)', name: 'graphql' },
        { color: 'var(--color-blue-500)', name: 'grpc' },
        { color: 'var(--color-red-600)', name: 'redis' },
        { color: 'var(--color-blue-900)', name: 'postgress' },
        { color: 'var(--color-sky-800)', name: 'mariadb' },
        { color: 'var(--color-green-700)', name: 'mongodb' },
        { color: 'var(--color-orange-700)', name: 'elastic' },
        { color: 'var(--color-neutral-700)', name: 'linux' },
        { color: 'var(--color-cyan-700)', name: 'docker' },
        { color: 'var(--color-orange-700)', name: 'gitlab' },
        { color: 'var(--color-neutral-400)', name: 'ci/cd' },
    ]

    const goto = (e: MouseEvent) => {
        const query = '#contact_me'
        let top = ((document.querySelector(query) as HTMLElement | null)?.offsetTop || 96) - 48; if (top === 48) top = 0
        document.body.scrollTo({ top, behavior: 'smooth' })
        router.push({ hash: query })
    }

</script>

<template>
    <section class="h-[48px] group" style="background-image: url('/patterns/topography.svg');" id="about">
        <div class="w-full h-full absolute group-hover:opacity-100 opacity-0 top-0 left-0" style="background-image: url('/patterns/topography-hover.svg');"></div>
        <Cross/>
    </section>

    <section class="h-fit flex justify-between gap-[48px]">
        <div class="flex flex-col gap-[48px]">
            <div class="h-full flex flex-col gap-[24px]">
                <h1 class="flex flex-col gap-[12px] mb-[]"><img src="@/assets/photo.webp" class="w-[256px] xl:hidden block"> {{ t('hi') }}</h1>
                <h2>{{ t('intro') }}</h2>
            </div>
            <div class="flex flex-col border text-sm! *:text-sm!">
                <div class="w-full flex items-center justify-between px-[12px] py-[4px] border-b">
                    <span class="text-xs! opacity-50">200 OK</span>
                    <span class="text-xs! opacity-50">{{ params_length }} bytes</span>
                </div>
                <div class="flex flex-col opacity-50 p-[12px]">
                    {
                    <span v-for="key, i in Object.keys(params)">&nbsp;&nbsp;"{{ key }}": "{{ params[(key as keyof typeof params)] }}"{{ i + 1 < Object.keys(params).length ? ',' : '' }}</span>
                    }
                </div>
            </div>
            <div class="flex flex-col gap-[24px]">
                <div class="flex flex-wrap gap-[4px]">
                    <div class="badge" :style="`--badge-color: ${badge.color}`" v-for="badge in badges">{{ badge.name }}</div>
                </div>
                <button @click="goto">{{ t('contact_me') }}</button>
            </div>
            
        </div>
        <div class="h-full w-px border-l border-dashed xl:block hidden"></div>
        <img src="@/assets/photo.webp" class="h-[400px] xl:block hidden">
    </section>
</template>

<style scoped>
    @import "tailwindcss";

    .badge {
        @apply text-sm! px-[12px] py-[4px] cursor-nw-resize! border
    }

    .badge:hover {
        border-color: var(--badge-color);
        background: color-mix(in oklab, var(--badge-color) 50%, transparent);
    }
</style>