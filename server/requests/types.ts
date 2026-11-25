export interface RequestFields {
    name?: string
    email?: string
    phone?: string
    telegram?: string
    message?: string
}

export interface RequestData { id: string, fields: RequestFields }
export interface RequestPatch extends RequestData { changed: (keyof RequestFields)[] }

export interface RequestProvider<Name extends string = string> {
    name: Name
    enabled: boolean
    create: (request: RequestData) => Promise<void>
    patch: (request: RequestPatch) => Promise<void>
}

export interface RequestResult { provider: string, ok: boolean, error?: string }

export interface Requests<Name extends string = string> {
    create: (request: RequestData) => Promise<RequestResult[]>
    patch: (request: RequestPatch) => Promise<RequestResult[]>
    instance: (...names: Name[]) => Requests<Name>
}
