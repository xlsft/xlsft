export type PixelBattleOptions = {
    cols: number
    rows: number
    base: number
    name: string    
    scale: {
        min: number
        max: number
        threshold: number
    },
    colors: {
        map: Record<number, string>
        bg: string
        fg: string
        hover: string
    }
}

export type PixelBattleCoords<Nullable extends boolean = false> = Nullable extends true
  ? { x: number | null, y: number | null }
  : { x: number, y: number }


export type PixelBattleState = {
    loading: boolean
    scale: number
    frame: number
    panning: boolean
    offset: PixelBattleCoords
    last: PixelBattleCoords
    hover: PixelBattleCoords<true>
    selected: PixelBattleCoords<true>
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
    }
    map: number[]
}