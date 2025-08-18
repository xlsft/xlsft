export type PixelBattleOptions = {
    cols: number
    rows: number
    base: number
    padding: number
    gif: {
        url: string
        speed: number
    }
    name: string    
    scale: {
        min: number
        max: number
    },
    colors: {
        map: Record<number, {
            color: string,
            background: string,
            borderColor: string,
            stroke: string,
            borderStyle: string,
            borderWidth: string,
        }>
        bg: string
        fg: string
        border: string
        hover: string
    }
}

export type PixelBattleCoords<Nullable extends boolean = false> = Nullable extends true
  ? { x: number | null, y: number | null }
  : { x: number, y: number }


export type PixelBattleState = {
    loading: boolean
    version: number
    scale: number
    frame: number
    panning: boolean
    offset: PixelBattleCoords
    last: PixelBattleCoords
    hover: PixelBattleCoords<true>
    selected: PixelBattleCoords<true>
    gif: {
        frames: HTMLCanvasElement[],
        frame: number
        delays: number[],
        last: number
    }
    touch: {
        dist: number | null,
        center: PixelBattleCoords | null
    }
    ui: {
        updating: {
            scale: boolean
            pos: boolean
        }
        color: number
        current: {
            color: number
            updated: string
            user: {
                name: string
                online: boolean | null
            }
        } | null
    }
    map: number[]
}