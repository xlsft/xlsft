import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { health } from "~/utils/health";
import { useState } from "nuxt/app";
import { db } from "../db/client";
import { sql } from "drizzle-orm";

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
        socket.on('pb:init', async () => {
            const colored = await (await db.execute(sql`SELECT i, color FROM pixelbattle_canvas`)).rows as { i: number; color: number }[]
            const array = new Array(500 * 500).fill(0).map((v, i) => {
                const color = colored.find(cv => cv.i-1 === i)
                if (color) return color.color
                else return v
            })
            socket.emit('pb:init:response', array)
        })
        socket.on('pb:draw', async (data) => {
            await db.execute(sql`
                INSERT INTO pixelbattle_canvas (i, color, updated_at, updated_by)
                VALUES (${data.i}, ${data.color}, CURRENT_TIMESTAMP, ${data.ip})
                ON CONFLICT (i) DO UPDATE SET
                    color = EXCLUDED.color,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = EXCLUDED.updated_by
            `)
            socket.broadcast.emit('pb:update', { i: data.i, color: data.color })
        })
    });

    io.on('close', () => {
        clearInterval(interval)
    })
    
    nitroApp.router.use("/socket.io/", defineEventHandler({
        handler(event) {
            // @ts-expect-error private method and property
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