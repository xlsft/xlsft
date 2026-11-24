<script setup lang="ts">
    import { usePreferredReducedMotion } from "@vueuse/core"

    const { t } = useI18n()
    const props = defineProps<{ data: IndexQuery }>()

    const config = useRuntimeConfig().public.config
    const stackOpen = ref(false)
    const tailTokens = [
        { text: ' |', color: 'text-dimmed' },
        { text: ' tail ', color: 'text-default' },
        { text: '-n', color: 'text-info' },
        { text: ' 0', color: 'text-warning' }
    ]
    const tailLength = tailTokens.reduce((length, token) => length + token.text.length, 0)
    const visibleLength = ref(stackOpen.value ? 0 : tailLength)
    const reducedMotion = usePreferredReducedMotion()
    const visibleTail = computed(() => {
        let remaining = visibleLength.value
        return tailTokens.map(({ text, color }) => {
            const visible = text.slice(0, Math.max(0, remaining))
            remaining -= text.length
            return { text: visible, color }
        })
    })

    watch([stackOpen, reducedMotion], ([open, motion], _, onCleanup) => {
        const target = open ? 0 : tailLength
        if (motion === 'reduce' || visibleLength.value === target) {
            visibleLength.value = target
            return
        }
        const step = Math.sign(target - visibleLength.value)
        const timer = window.setInterval(() => {
            visibleLength.value += step
            if (visibleLength.value === target) window.clearInterval(timer)
        }, 28)
        onCleanup(() => window.clearInterval(timer))
    })

    const bio = computed(() => {
        const content = props.data.summary.content?.trim() || ''
        const heading = content.match(/^# +([^\n]+)(?:\n|$)/)
        return {
            heading: heading?.[1].trim() || props.data.summary.title,
            body: content.slice(heading?.[0].length ?? 0).trim() || props.data.summary.description
        }
    })

    // user@host как в шапке fastfetch
    const prompt = { user: 'root', host: 'xlsft' }

    // заголовок вида «Senior Frontend-разработчик (Илья Торшин)» → роль и имя отдельными строками
    const identity = computed(() => {
        const title = props.data.summary.title || ''
        const match = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
        return match ? { role: match[1], user: match[2] } : { role: title, user: '' }
    })

    // где работаю сейчас — компании с текущей позицией
    const host = computed(() => (props.data.experience ?? [])
        .filter(company => company.positions?.some(position => !position.duration?.to))
        .map(company => company.name)
        .join(', '))

    const groups = computed(() => (props.data.skills ?? [])
        .filter(group => group.items?.length)
        .map(group => ({
            type: group.type,
            items: [...group.items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        }))
        // категории — по убыванию числа навыков; при равенстве остаётся алфавитный порядок из запроса
        .sort((a, b) => b.items.length - a.items.length))
    const packages = computed(() => groups.value.reduce((total, group) => total + group.items.length, 0))
    const shell = computed(() => groups.value.find(group => group.type === 'frontend')
        ?.items.slice(0, 3).map(skill => skill.name).join(', '))

    const uptime = computed(() => {
        const experience = props.data.experience
        const from = experience?.at(-1)?.positions?.at(-1)?.duration?.from
        return from ? useExperience(from, experience?.at(0)?.positions?.at(0)?.duration?.to).duration() : ''
    })

    const links = computed(() => Object.values(props.data.links ?? {})
        .filter((link): link is NonNullable<typeof link> => !!link?.to))
    // на бумаге ссылку не кликнуть — печатаем адрес без протокола
    const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

    // палитра терминала, как блоки цветов внизу вывода fastfetch
    const palette = ['bg-(--ui-border)', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-inverted']
</script>

<template>
    <MoleculesSection
        name="profile"
        :title="`~/ \0p$ \0ofastfetch \0d&& \0ocat \0sreadme.md${groups.length ? ` \0d&& \0sstack.tsv` : ``}`"
    >

    </MoleculesSection>
</template>
