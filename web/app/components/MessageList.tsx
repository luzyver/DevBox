import { MessageSummary } from './types'
import { MessageCard } from './MessageCard'

interface Props {
  messages: MessageSummary[]
  selectedId: string | null
  newMessageIds: Set<string>
  onSelect: (msg: MessageSummary) => void
}

export function MessageList({ messages, selectedId, newMessageIds, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {messages.map(m => (
        <MessageCard
          key={m.id}
          message={m}
          isSelected={m.id === selectedId}
          isNew={newMessageIds.has(m.id)}
          onClick={() => onSelect(m)}
        />
      ))}
    </div>
  )
}
