<script setup lang="ts">
    import bytes from 'bytes'

    const props = defineProps<{ endpoint?: string }>()
    const container = useTemplateRef('container')
    const length = ref(0)

    let observer: MutationObserver

    onMounted(() => {
        if (!container.value) return
        const update = () => length.value = new TextEncoder().encode(container.value!.textContent).length; update()
        observer = new MutationObserver(update); 
        observer.observe(container.value, { childList: true, subtree: true, characterData: true })
        onBeforeUnmount(() => observer?.disconnect())
    })
</script>

<template>
    <div class="flex flex-col *:text-sm! *:text-default/50! border! border-default!">
        <div class="grow! flex! items-center! *:text-xs! justify-between! px-3! py-1! border-b! border-default!">
            <span>200 OK {{ props.endpoint }}</span>
            <span>{{ bytes(length, { unitSeparator: ' ' }) }}</span>
        </div>
        <div class="grow! p-3! *:m-0!" ref="container">
            <MDCSlot class=""/>
        </div>
    </div>
</template>