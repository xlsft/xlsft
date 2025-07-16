import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { health } from "~/utils/health";
import { useState } from "nuxt/app";

export default defineNitroPlugin((nitroApp: NitroApp) => {
    const engine = new Engine();
    const io = new Server();
    let interval: NodeJS.Timeout

    io.bind(engine);

    io.on("connection", (socket) => {
        socket.on('debug', () => {
            socket.emit('health', health())
            interval = setInterval(() => socket.emit('health', health()), 1000)
        })
    });

    io.on('close', () => {
        clearInterval(interval)
    })
    
    nitroApp.router.use("/socket.io/", defineEventHandler({
        handler(event) {
            engine.handleRequest(event.node.req, event.node.res);
            event._handled = true;
        },
        websocket: {
            open(peer) {
                // @ts-expect-error private method and property
                engine.prepare(peer._internal.nodeReq);
                // @ts-expect-error private method and property
                engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
            }
        }
    }));
});