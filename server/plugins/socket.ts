import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { health } from "~/utils/health";
import { db } from "../db/client";
import { canvas } from "../db/schema/canvas.schema";
import { TelegramAuthUser } from "~/types/telegram.types";
import { user } from "../db/schema/user.schema";
import { eq, ne, sql } from "drizzle-orm";

class Debouncer {
    private timeouts: Record<string, NodeJS.Timeout> = {}
    constructor(private wait: number) {}
    use(action: () => void, id: string = 'global') {
        clearTimeout(this.timeouts[id])
        this.timeouts[id] = setTimeout(() => action(), this.wait)
    }
    clear(id: string = 'global') {
        clearTimeout(this.timeouts[id])
    }
}


export default defineNitroPlugin((nitroApp: NitroApp) => {
    const engine = new Engine();
    const io = new Server();
    let interval: NodeJS.Timeout
    let update_interval: NodeJS.Timeout
    const debouncer = new Debouncer(10000)
    let draw_stack: { i: { x: number, y: number }, c: number }[] = []
    io.bind(engine);

    io.on("connection", (socket) => {
        socket.on('debug', () => {
            socket.emit('health', health())
            interval = setInterval(() => socket.emit('health', health()), 1000)
        })
        socket.on('pb:init', async () => {
            const data = await (await db.select({ i: canvas.coordinates, c: canvas.color, u: canvas.updated_by, a: canvas.updated_at }).from(canvas).where(ne(canvas.color, 0))).map(v => {
                const [ x, y ] = v.i.split(':').map(Number) as [number, number]
                return { ...v, i: { x, y } }
            })
            const result = data.filter(v => v.c !== 0).map(({ i, c }) => ((i.x << 13) | (i.y << 4) | c!).toString(36).padStart(5,'0')).join('')
            socket.emit('pb:init:response', result)
        })
        socket.on('pb:draw', async (data: { color: number, coordinates: { x: number, y: number }, uuid: TelegramAuthUser['uuid'] }) => {
            if (data.color > 9 || data.color < 0 || data.coordinates.x > 1023 || data.coordinates.x < 0 ||  data.coordinates.y > 1023 || data.coordinates.y < 0) return
            const result = await db.insert(canvas).values({ color: data.color, coordinates: `${data.coordinates.x}:${data.coordinates.y}`, updated_at: new Date(), updated_by: data.uuid }).onConflictDoUpdate({
                target: canvas.coordinates,
                set: {
                    color: data.color, updated_at: new Date(), updated_by: data.uuid
                }
            }).returning()
            const [ x, y ] = result[0].coordinates.split(':').map(Number) as [number, number]
            draw_stack.push({ c: result[0].color!, i: { x, y } })     
        })

        socket.on('pb:info', async (c: { x: number, y: number }) => {
            const data = (await db.select().from(canvas).where(eq(canvas.coordinates, `${c.x}:${c.y}`)).leftJoin(user, eq(user.uuid, canvas.updated_by)))[0]
            if (!data) return
            const info = {
                color: data.canvas.color,
                updated: data.canvas.updated_at,
                user: {
                    name: data.user?.name,
                    online: data.user?.online
                }
            }
            socket.emit('pb:info:response', info)
        })

        socket.on('pb:user', async (uuid) => {
            const data = (await db.select().from(user).where(eq(user.uuid, uuid as string)))[0]
            socket.emit('pb:user:response', data)
        })
        if (!update_interval) update_interval = setInterval(() => {
            if (draw_stack.length === 0) return
            const stack = [ ...draw_stack ]; draw_stack = []
            socket.broadcast.emit('pb:update', stack.map(({ i, c }) => ((i.x << 13) | (i.y << 4) | c!).toString(36).padStart(5,'0')).join(''))
        }, 2000)
    });



    io.on('close', () => {
        clearInterval(interval)
        clearInterval(update_interval)
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