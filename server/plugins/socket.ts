import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { health } from "~/utils/health";
import { db } from "../db/client";
import { canvas } from "../db/schema/canvas.schema";
import { TelegramAuthUser } from "~/types/telegram.types";
import { user } from "../db/schema/user.schema";
import { eq, sql } from "drizzle-orm";

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
    let online_interval: NodeJS.Timeout
    const debouncer = new Debouncer(10000)

    io.bind(engine);

    io.on("connection", (socket) => {
        socket.on('debug', () => {
            socket.emit('health', health())
            interval = setInterval(() => socket.emit('health', health()), 1000)
        })
        socket.on('pb:init', async () => {
            const result = await (await db.select({ i: canvas.coordinates, c: canvas.color, u: canvas.updated_by, a: canvas.updated_at }).from(canvas)).map(v => {
                const [ x, y ] = v.i.split(':').map(Number) as [number, number]
                return { ...v, i: { x, y } }
            })
            socket.emit('pb:init:response', result)
        })
        socket.on('pb:draw', async (data: { color: number, coordinates: { x: number, y: number }, user: TelegramAuthUser }) => {
            const result = await db.insert(canvas).values({ color: data.color, coordinates: `${data.coordinates.x}:${data.coordinates.y}`, updated_at: new Date(), updated_by: data.user.uuid }).onConflictDoUpdate({
                target: canvas.coordinates,
                set: {
                    color: data.color, updated_at: new Date(), updated_by: data.user.uuid
                }
            }).returning()
            const [ x, y ] = result[0].coordinates.split(':').map(Number) as [number, number]
            socket.broadcast.emit('pb:update', { color: result[0].color, coordinates: { x, y } })
            await db.update(user).set({ online: true }); debouncer.use(async () => await db.update(user).set({ online: false }), data.user.uuid)            
        })

        socket.on('pb:info', async (c: { x: number, y: number }) => {
            const data = (await db.select().from(canvas).where(eq(canvas.coordinates, `${c.x}:${c.y}`)).leftJoin(user, eq(user.uuid, canvas.updated_by)))[0]
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

        const online = async () => {
            socket.emit('pb:online', (await db.select().from(user).where(eq(user.online, true))).length)
        }; online(); online_interval = setInterval(online, 2000)
    });

    io.on('close', () => {
        clearInterval(interval)
        clearInterval(online_interval)
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