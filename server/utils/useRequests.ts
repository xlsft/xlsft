import { build } from '../requests/build'
import { email } from '../requests/email'
import type { Requests } from '../requests/types'

/**
 * Outgoing delivery of requests from the chat. By default it goes to every provider:
 * `useRequests().create(request)`; one provider only: `useRequests().instance('email').create(request)`.
 * A provider without settings is skipped.
 */
const providers = { email }

export type RequestProviderName = keyof typeof providers

export const useRequests = (): Requests<RequestProviderName> => build(Object.values(providers).map(provider => provider()))
