<script setup lang="ts">
    const props = defineProps<{
        label: string
        rows: { type: string, items: string[] }[]
        sticky?: boolean
        wide?: boolean
        compact?: boolean
    }>()

    const gutter = computed<string>(() => props.compact
        ? 'w-ch-9 pr-ch text-right align-top text-comment tabular-nums'
        : 'w-gutter pr-4 text-right align-top text-comment tabular-nums max-sm:w-gutter-sm max-sm:pr-2.5')
    const key = computed<string>(() => props.compact ? 'pl-ch-2 text-left align-top font-normal' : 'pl-6 text-left align-top font-normal max-sm:pl-3')
    const value = computed<string>(() => props.compact ? 'pr-ch-2' : 'pr-8 max-sm:pr-4')
    const tab = 'mx-ch-half text-line'
</script>

<template>
    <table
        :aria-label="props.label"
        class="w-full table-fixed border-collapse"
        :class="[
            props.compact ? 'text-xs/5' : 'text-sm/6.5 max-sm:text-xs/5',
            props.sticky && 'sticky top-header',
        ]"
    >
        <thead>
            <tr :class="props.compact ? '*:pt-2' : '*:pt-5'">
                <td aria-hidden="true" :class="[gutter, !props.sticky && 'border-r border-default']">1</td>
                <th scope="col" :class="[key, props.compact ? 'w-key' : props.wide ? 'w-key-wide max-sm:w-key-wide-sm' : 'w-key max-sm:w-key-sm']" class="text-comment">category<span aria-hidden="true" :class="tab">⇥</span></th>
                <th scope="col" class="text-left align-top font-normal text-comment" :class="value">items</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(row, index) in props.rows" :key="row.type" class="print:break-inside-avoid" :class="index === props.rows.length - 1 && (props.compact ? '*:pb-2' : '*:pb-6')">
                <td aria-hidden="true" :class="[gutter, !props.sticky && 'border-r border-default']">{{ index + 2 }}</td>
                <th scope="row" :class="key" class="text-warning">{{ row.type }}<span aria-hidden="true" :class="tab">⇥</span></th>
                <td class="align-top text-default/78" :class="value">
                    <template v-for="(item, itemIndex) in row.items" :key="item"><span>{{ item }}</span><template v-if="itemIndex < row.items.length - 1"><span aria-hidden="true" :class="tab">⇥</span><wbr></template></template>
                </td>
            </tr>
        </tbody>
    </table>
</template>
