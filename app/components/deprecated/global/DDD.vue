<script setup lang="ts">

    const ddd_diff = ref()
    const ddd_diff_update = () => {
        const now = Date.now();
        let diff = new Date("2026-06-29T00:00:00Z").getTime() - now;
        ddd_diff.value = diff
    }
    onMounted(() => { setInterval(ddd_diff_update, 33) })
    const ddd = computed(() => {
        if (ddd_diff.value < 0) ddd_diff.value = 0;
        const days = Math.floor(ddd_diff.value / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ddd_diff.value / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((ddd_diff.value / (1000 * 60)) % 60);
        const seconds = Math.floor((ddd_diff.value / 1000) % 60);
        const milliseconds = ddd_diff.value % 1000;
        return `${days}:${hours}:${minutes}:${seconds}:${milliseconds}`
    })

</script>

<template>
    <a target="_blank" href="https://ddd-tobi.deno.dev">ddd: {{ ddd }}</a>&nbsp;<br><br>
</template>