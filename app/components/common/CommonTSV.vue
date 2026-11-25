<script setup lang="ts">
    const props = defineProps<{
        label: string
        rows: { type: string, items: string[] }[]
        sticky?: boolean
        wide?: boolean
    }>()

    const gutter = 'w-gutter pr-4 text-right align-top text-comment tabular-nums max-sm:w-gutter-sm max-sm:pr-2.5'
    const key = 'pl-6 text-left align-top font-normal max-sm:pl-3'
    const tab = 'mx-ch-half text-line'
</script>

<template>
    <table
        :aria-label="props.label"
        class="w-full table-fixed border-collapse text-sm/6.5 max-sm:text-xs/5"
        :class="[
            props.sticky && 'sticky top-header',
        ]"
    >
        <thead>
            <tr class="*:pt-5">
                <td aria-hidden="true" :class="[gutter, !props.sticky && 'border-r border-default']">1</td>
                <th scope="col" :class="[key, props.wide ? 'w-key-wide max-sm:w-key-wide-sm' : 'w-key max-sm:w-key-sm']" class="text-comment">category<span aria-hidden="true" :class="tab">⇥</span></th>
                <th scope="col" class="pr-8 text-left align-top font-normal text-comment max-sm:pr-4">items</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(row, index) in props.rows" :key="row.type" class="print:break-inside-avoid" :class="index === props.rows.length - 1 && '*:pb-6'">
                <td aria-hidden="true" :class="[gutter, !props.sticky && 'border-r border-default']">{{ index + 2 }}</td>
                <th scope="row" :class="key" class="text-warning">{{ row.type }}<span aria-hidden="true" :class="tab">⇥</span></th>
                <td class="pr-8 align-top text-default/78 max-sm:pr-4">
                    <template v-for="(item, itemIndex) in row.items" :key="item"><span>{{ item }}</span><template v-if="itemIndex < row.items.length - 1"><span aria-hidden="true" :class="tab">⇥</span><wbr></template></template>
                </td>
            </tr>
        </tbody>
    </table>
</template>
