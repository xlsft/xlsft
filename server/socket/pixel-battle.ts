import { Server, Socket } from "socket.io";
import { Debouncer } from "../utils/debouncer";
import { db } from "../db/client";
import { canvas } from "../db/schema/canvas.schema";
import { user } from "../db/schema/user.schema";
import { and, eq, ne } from "drizzle-orm";
import { TelegramAuthUser } from "~/types/telegram.types";

export default (socket: Socket, io: Server) => {

    let stack: { x: number, y: number, c: number }[] = []
    const pack = async (data: { x: number, y: number, c: number }[]) => {
        const buffer = new Uint8Array(Math.ceil(data.length * 24 / 8));
        data.forEach(({ x, y, c }, idx) => {
            for (let b = 0; b < 24; b++) {
                const bit = (((x << 14) | (y << 4) | c!) >> (23 - b)) & 1;
                const index = idx * 24 + b;
                buffer[Math.floor(index / 8)] |= bit << (7 - (index % 8));
            }
        });
        return buffer
    }
    
    socket.on('pb:init', async () => {
        const data = await (await db.select({ x: canvas.x, y: canvas.y, c: canvas.color }).from(canvas).where(ne(canvas.color, 0)))
        socket.emit('pb:init:response', await pack(data));
    })

    socket.on('pb:draw', async (data: { color: number, coordinates: { x: number, y: number }, uuid: TelegramAuthUser['uuid'] }) => {
        if (data.color > 9 || data.color < 0 || data.coordinates.x > 1023 || data.coordinates.x < 0 ||  data.coordinates.y > 1023 || data.coordinates.y < 0) return
        const result = (await db.insert(canvas).values({ color: data.color, x: data.coordinates.x, y: data.coordinates.y }).onConflictDoUpdate({
            target: [canvas.x, canvas.y],
            set: {
                color: data.color, updated_at: new Date(), updated_by: data.uuid
            }
        }).returning())[0]
        stack.push({ c: result.color, x: result.color, y: result.color })     
    })

    socket.on('pb:info', async (c: { x: number, y: number }) => {
        const data = (await db.select().from(canvas).where(and(eq(canvas.x, c.x), eq(canvas.y, c.y))).leftJoin(user, eq(user.uuid, canvas.updated_by)))[0]
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

    socket.on('pb:user', async (uuid) => { try {
        const data = (await db.select().from(user).where(eq(user.uuid, uuid as string)))[0]
        socket.emit('pb:user:response', data)
    } catch (e) { socket.emit('pb:user:response:error', e)} })

    let interval: NodeJS.Timeout = setInterval(async () => {
        if (!stack.length) return
        socket.broadcast.emit('pb:update', await pack(stack))
        stack = [];
    }, 2000)
    io.on('close', () => clearInterval(interval))
}