<script setup lang="ts">
    // echo — строка-шаблон, результат которой выводится в слоте detail (например, `($DURATION)`)
    const props = defineProps<{ filename?: string, echo?: string }>()

    // строка в двойных кавычках: текст — как строка, `$VAR` внутри — как подстановка переменной
    const echoParts = computed(() => (props.echo || '').split(/(\$\w+)/).filter(Boolean).map(text => ({
        text,
        variable: text.startsWith('$')
    })))
</script>

<template>
    <header class="flex items-center justify-between gap-4 border-b border-default px-6 py-4 sm:p-4 lg:px-8 lg:py-6">
        <div class="min-w-0 flex flex-col gap-1 sm:gap-3">
            <slot name="command">
                <div class="flex items-center gap-3 text-base">
                    <h2 class="text-xl! font-bold sm:text-base! sm:font-normal! sm:text-dimmed"><slot/></h2>
                    <span aria-hidden="true" class="hidden items-center gap-3 sm:flex">
                        <span class="text-primary">$</span>
                        <template v-if="echo">
                            <span class="text-default">echo</span>
                            <span class="text-info">"<span v-for="(part, index) in echoParts" :key="index" :class="part.variable && 'text-warning'">{{ part.text }}</span>"</span>
                            <span class="text-dimmed">&amp;&amp;</span>
                        </template>
                        <span class="text-default">cat</span>
                        <span class="text-success">{{ filename }}</span>
                    </span>
                </div>
            </slot>
            <slot name="detail"/>
        </div>
        <OrganismsContactButton class="shrink-0 max-sm:hidden!"/>
    </header>
</template>
