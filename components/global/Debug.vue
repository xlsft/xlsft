<script setup lang="ts">

    const debug = defineModel<boolean>()
    const debug_count = defineModel<number>('clicks', { required: true })
    const debug_count_interval = ref(); onMounted(() => debug_count_interval.value = setInterval(() => debug_count.value = Math.max(debug_count.value - 1, 0), 300))
    watch(() => debug_count.value, () => {
        if (debug_count.value < 5) return
        clearInterval(debug_count_interval.value)
        debug.value = true
    })

    const socket = useSocket();

    const ws_connected = ref(false);
    const ws_transport = ref("n/a");
    const ws_connect = () => { ws_connected.value = true; ws_transport.value = socket.io.engine.transport.name; socket.io.engine.on("upgrade", (e) => ws_transport.value = e.name) }
    const ws_disconnect = () => { ws_connected.value = false; ws_transport.value = "n/a" }

    if (socket.connected) ws_connect()
    socket.on("connect", ws_connect); socket.on("disconnect", ws_disconnect)
    onBeforeUnmount(() => { socket.off("connect", ws_connect); socket.off("disconnect", ws_disconnect) })

    watch(() => debug.value, () => { if (debug.value) socket.emit('debug') })

    const health = ref(null); socket.on('health', (json) => {
        health.value = JSON.parse(json)
    })

</script>

<template>
    <template v-if="debug">
        transport: {{ ws_transport }}<br>
        ws: {{ ws_connected ? "connected" : "disconnected" }}<br>
        <pre>health: {{ health ? JSON.stringify(health, null, 4) : 'pending' }}</pre><br>
    </template>
</template>