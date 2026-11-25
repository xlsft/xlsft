<script setup lang="ts">
    import { useProjectsStore } from '~/stores/projects'

    const { t } = useI18n()
    const projectsStore = useProjectsStore()

    const field = useTemplateRef<HTMLInputElement>('field')

    const state = ref<{ focused?: boolean, caret: { index: number, scroll: number } }>({ caret: { index: 0, scroll: 0 } })

    const methods = {
        caret(): void {
            const element = field.value
            if (!element || document.activeElement !== element) return
            state.value.caret = { index: element.selectionEnd ?? element.value.length, scroll: element.scrollLeft }
        },
        focus(): void {
            nextTick(() => {
                const element = field.value
                if (!element) return
                element.focus()
                element.setSelectionRange(element.value.length, element.value.length)
            })
        },
        keydown(event: KeyboardEvent): void {
            if (event.key === 'Tab' && projectsStore.complete()) event.preventDefault()
            else if (event.key === 'Enter') {
                event.preventDefault()
                projectsStore.run()
            } else if (event.key === 'Escape') projectsStore.type()
        },
    }

    watch(() => projectsStore.state.focus, methods.focus)
    onMounted(() => document.addEventListener('selectionchange', methods.caret))
    onBeforeUnmount(() => document.removeEventListener('selectionchange', methods.caret))
</script>

<template>
    <div class="flex min-w-0 flex-1 cursor-text! items-center gap-3 text-base" @click="methods.focus">
        <CommonHighlight class="shrink-0" :text="`\0p$ \0ols`"/>
        <label class="relative flex min-w-0 flex-1 items-center">
            <span class="sr-only">{{ t('labels.terminal_input') }}</span>
            <span aria-hidden="true" class="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre">
                <CommonHighlight :text="projectsStore.line"/>
                <span class="opacity-40">{{ projectsStore.completion?.slice(projectsStore.partial.length) }}</span>
                <span v-if="!projectsStore.text" class="ml-ch opacity-40">--tag</span>
                <span
                    v-if="state.focused || !projectsStore.text"
                    class="absolute top-1/2 h-5 w-ch -translate-y-1/2 animate-pulse bg-white mix-blend-difference"
                    :style="{ left: `calc(${state.focused ? state.caret.index : projectsStore.text.length}ch - ${state.focused ? state.caret.scroll : 0}px)` }"
                />
            </span>
            <input
                ref="field"
                :value="projectsStore.text"
                type="text"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="w-full cursor-text! border-0 bg-transparent p-0 text-transparent caret-transparent outline-none"
                @input="projectsStore.type(($event.target as HTMLInputElement).value)"
                @focus="state.focused = true"
                @blur="state.focused = undefined"
                @keydown="methods.keydown"
            >
        </label>
    </div>
</template>
