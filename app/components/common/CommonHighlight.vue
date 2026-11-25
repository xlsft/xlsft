<script setup lang="ts">
    // pseudo highlighting of a terminal line: every \0 starts a token, the char after it picks the color,
    // an optional {href} right after the color char turns the token into a link of that color
    // `~/ \0p$ \0ofastfetch \0d{/ru#projects}~/projects/` → `~/ ` default, `$ ` primary, `fastfetch ` default, `~/projects/` dimmed link
    // colors: o default · d dimmed · c comment · p primary · i info · w warning · e error · s success
    const props = defineProps<{
        text: string
    }>()

    interface Token { text: string, color: string, href?: string }

    const colors: Record<string, string> = {
        o: 'var(--ui-text)',
        d: 'var(--ui-text-dimmed)',
        c: 'var(--ui-text-comment)',
        p: 'var(--ui-primary)',
        i: 'var(--ui-info)',
        w: 'var(--ui-warning)',
        e: 'var(--ui-error)',
        s: 'var(--ui-success)',
    }

    function parse(text: string): Token[] {
        return text.split('\0').map((chunk, index) => {
            const code = index === 0 ? 'o' : chunk.charAt(0)
            const rest = index === 0 ? chunk : chunk.slice(1)
            const link = /^\{([^}]+)\}/.exec(rest)
            return { color: colors[code] ?? colors.o!, href: link?.[1], text: link ? rest.slice(link[0].length) : rest }
        }).filter((token) => token.text.length > 0)
    }
</script>

<template>
    <code>
        <template v-for="(token, index) in parse(props.text)" :key="index">
            <NuxtLink v-if="token.href" :to="token.href" class="terminal-link" :style="{ '--terminal-link-color': token.color, '--terminal-link-hover': 'var(--ui-primary)' }">{{ token.text }}</NuxtLink>
            <span v-else :style="{ color: token.color }">{{ token.text }}</span>
        </template>
    </code>
</template>
