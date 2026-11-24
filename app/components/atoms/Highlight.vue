<script setup lang="ts">
    const props = defineProps<{
        text: string
    }>()

    const tokens = computed<{ text: string, class: string }[]>(() => {
        const classes = {
            'o': 'text-default',
            'd': 'text-dimmed',
            'p': 'text-primary',
            'i': 'text-info',
            'w': 'text-warning',
            'e': 'text-error',
            's': 'text-success',
        }
        return props.text
            .split('\0')
            .map((chunk, i) => ({
                text: i === 0 ? chunk : chunk.slice(1),
                class: classes[(i === 0 ? 'o' : chunk.charAt(0)) as keyof typeof classes] ?? classes['o'],
            }))
            .filter(token => token.text.length > 0)
    })
</script>

<template>
    <code>
        <span v-for="token in tokens" :class="token.class">{{ token.text }}</span>
    </code>
</template>
