<script setup lang="ts">
    const { t, locale } = useI18n()
    import { useCase } from "@xlsft/nuxt"
    const current = ref('ained')
    const _current = computed(() => experience.find(v => v.id === current.value))

    type DatePoint = { month: number, year: number }
    const experience: { id: string, from: DatePoint, to?: DatePoint }[] = [
        { id: 'xls', from: { month: 10, year: 2020 }, to: { month: 1, year: 2023 } },
        { id: 'ained', from: { month: 1, year: 2023 }, to: { month: 3, year: 2025 } },
        { id: 'briskly', from: { month: 3, year: 2025 } }
    ]

    const duration = (from: DatePoint, to?: DatePoint) => {
        const now = new Date()
        const start = new Date(from.year, from.month - 1)
        const end = to ? new Date(to.year, to.month - 1) : now

        const month = (date: Date) => {
            const name = new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(date)
            return name.charAt(0).toUpperCase() + name.slice(1)
        }
        const date = (date: Date) => `${month(date)} ${date.getFullYear()}`

        const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
        const years = Math.floor(diff / 12)
        const months = diff % 12

        const format = () => {
            const parts = []
            if (years) parts.push(useCase(years, t('one_year'), t('two_years'), t('more_years')))
            if (months) parts.push(useCase(months + 1, t('one_month'), t('two_months'), t('more_months')))
            return parts.join(' ')
        }

        const range = `${date(start)} — ${to ? date(end) : t('present')}`
        return `${range} / ${format()}`
    }

</script>

<template>

    <SectionHeader id="experience" class="print:hidden" style="background-image: url('/patterns/architect.svg');" hover-style="background-image: url('/patterns/architect-hover.svg');">
        <br>
        <span class="text-md! opacity-50">({{ duration(experience.at(0)!.from, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }).split(' / ').at(-1) }})</span>
    </SectionHeader>

    <section class="print:hidden p-0! min-h-[48px] flex sm:flex-row flex-col gap-[1px]" style="background-image: url('/patterns/texture.svg');">
        <div class="relative h-[48px] grow flex items-center justify-center border-r last:border-none hover:outline-1 outline-blue-500! data-[active=true]:bg-black data-[active=true]:outline-1 cursor-nw-resize! group mask-radial-at-left after:opacity-50 after:ml-[8px]" @click="current = item.id" v-for="item in experience" :data-active="item.id === current">
            {{ t(`exp.${item.id}.title`) }}
        </div>
    </section>
    
    <section class="print:hidden">
        <div class="h-fit flex justify-between gap-[24px] xl:gap-[48px] flex-col xl:flex-row">
            <div class="flex flex-col">
                <img class="h-[72px] w-fit mb-[24px]" :src="`/logo/${current}.svg`">
                <p class="text-sm opacity-75" v-html="t(`exp.${current}.history`)"></p>
            </div>
            <div class="flex flex-col min-w-[300px]">
                <span class="text-lg">{{ t(`exp.${current}.position`) }}</span>
                <span class="text-md opacity-75" v-if="_current">{{ locale && duration(_current.from, _current.to) }}</span>
                <a v-if="current !== 'xls'" target="_blank" ref="noreferrer" :href="t(`exp.${current}.more_link`)">{{ t(`exp.${current}.more_label`) }}</a>
            </div>
        </div>
        <h3 class="mt-[24px]">{{ t('job_description') }}</h3>
        <p class="mt-[24px]" v-html="t(`exp.${current}.job`).split('---NOPRINT---').join('\n')"></p>
    </section>

    <div class="max-h-[90dvh]">
        <section class="hidden print:flex flex-col mb-[48px]" v-for="item in experience">
            <div class="w-full flex justify-between gap-[12px]">
                <img class="h-[48px]" :src="`/logo/${item.id}_print.svg`">
                <div class="flex flex-col gap-[8px]">
                    <h3 class="text-right">{{ t(`exp.${item.id}.position`).split('/').at(-1) }}</h3>
                    <span class="text-xl opacity-75 text-right">{{ locale && duration(item.from, item.to) }}</span>
                </div>
            </div>
            <p class="mt-[12px]" v-html="t(`exp.${item.id}.job`).split('---NOPRINT---')[0]"></p>
        </section>
    </div>


</template>