export interface MessageSummary {
  id: string
  from: string
  to: string
  subject: string
  body: string
  date: number
  isNew?: boolean
}

export interface MessageDetail extends MessageSummary {
  html?: string
}

export type ConnectionState = 'connected' | 'reconnecting' | 'offline'

export interface RealtimeEvent {
  type: 'new_email' | 'delete'
  payload: MessageSummary
}

export interface InboxState {
  messages: MessageSummary[]
  loading: boolean
  error: string | null
  connectionState: ConnectionState
}
