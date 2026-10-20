import { httpApi } from './client'
import type { Api } from './client'
import { mockApi } from './mock'

export const api: Api =
  import.meta.env.VITE_USE_MOCK === 'true' ? mockApi : httpApi
