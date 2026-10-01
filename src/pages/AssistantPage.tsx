import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bug, MessageCircle, Plus, Send, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  askAssistant,
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  saveMessage,
} from '@/services/assistant'
import { fetchInsectDetail } from '@/services/knowledge'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { ChatMessage } from '@/services/assistant'

interface LocalMessage extends ChatMessage {
  pending?: boolean
}

const STARTERS = [
  'What insect is damaging my crop?',
  'How can I distinguish aphids from whiteflies?',
  'Explain the life cycle of a bollworm.',
  'What are natural enemies of this pest?',
  'How do I monitor whitefly populations?',
]

export function AssistantPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const insectId = searchParams.get('insect') ?? ''

  const insectQuery = useQuery({
    queryKey: ['insect', insectId],
    queryFn: () => fetchInsectDetail(insectId),
    enabled: Boolean(insectId),
  })

  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => fetchConversations(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  const messagesQuery = useQuery({
    queryKey: ['conversation-messages', activeConversation],
    queryFn: () => fetchConversationMessages(activeConversation ?? ''),
    enabled: Boolean(activeConversation),
  })

  useEffect(() => {
    // Sync the persisted transcript into the live chat buffer when the queried
    // transcript for the active conversation changes (external data -> local state).
    // oxlint-disable-next-line react/set-state-in-effect
    if (messagesQuery.data) setMessages(messagesQuery.data)
  }, [messagesQuery.data])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const startNewChat = () => {
    setActiveConversation(null)
    setMessages([])
    setInput('')
  }

  const openConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    setMessages([])
  }

  async function runSend(override?: string) {
    const text = (override ?? input).trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)

    const userMessage: LocalMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const history: LocalMessage[] = [...messages, userMessage]
    setMessages([...history, { id: crypto.randomUUID(), role: 'assistant', content: '', pending: true }])

    let conversationId = activeConversation
    try {
      if (!conversationId && user) {
        conversationId = await createConversation({
          userId: user.id,
          title: text.slice(0, 60),
          contextInsectId: insectId || undefined,
        })
        if (conversationId) {
          setActiveConversation(conversationId)
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      }

      const { reply } = await askAssistant({
        messages: history.map((message) => ({ role: message.role, content: message.content })),
        insectName: insectQuery.data?.common_name ?? null,
      })

      setMessages([...history, { id: crypto.randomUUID(), role: 'assistant', content: reply }])

      if (conversationId) {
        await saveMessage({ conversationId, role: 'user', content: text })
        await saveMessage({ conversationId, role: 'assistant', content: reply })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setMessages([...history, { id: crypto.randomUUID(), role: 'assistant', content: `‚ ${message}`, pending: false }])
    } finally {
      setBusy(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteConversation(user?.id ?? '', activeConversation ?? ''),
    onSuccess: () => {
      setActiveConversation(null)
      setMessages([])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const insectName = insectQuery.data?.common_name

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone="leaf" className="mb-2">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> EntomoAI
          </Badge>
          <h1 className="font-serif text-3xl font-semibold">Ask EntomoAI</h1>
          <p className="mt-1 max-w-2xl text-ink-400">
            Entomology intelligence grounded in the EntomoLens database — taxonomy, pests, life
            cycles, symptoms and IPM. No invented citations.
          </p>
        </div>
        <Button variant="secondary" onClick={startNewChat}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New chat
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-4">
        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-3">
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              Conversations
            </p>
            {conversationsQuery.data?.length ? (
              <ul className="space-y-1">
                {conversationsQuery.data.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      onClick={() => openConversation(conversation.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                        activeConversation === conversation.id
                          ? 'bg-forest-800 text-cream-50'
                          : 'text-forest-800 hover:bg-forest-50',
                      )}
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{conversation.title ?? 'Untitled'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 pb-2 text-sm text-ink-400">
                {user ? 'No conversations yet.' : 'Sign in to save conversations.'}
              </p>
            )}
          </Card>
        </aside>

        <div className="flex flex-col lg:col-span-3">
          <Card className="flex min-h-[60vh] flex-col overflow-hidden">
            {insectName && (
              <div className="flex items-center gap-2 border-b border-forest-100 bg-cream-100/60 px-5 py-3">
                <Bug className="h-4 w-4 text-leaf-600" aria-hidden="true" />
                <span className="text-sm font-medium text-forest-800">Focused on: {insectName}</span>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center">
                  <EmptyState
                    className="min-h-52"
                    title={insectName ? `Ask about ${insectName}` : 'Ask anything about insects'}
                    description={
                      insectName
                        ? 'Biology, symptoms, management or interesting facts about this species.'
                        : 'Try “Which insect damages cotton?”, “Explain complete metamorphosis” or “How do I monitor whitefly?”'
                    }
                    icon={<Sparkles className="h-10 w-10" aria-hidden="true" />}
                  />
                  {!insectName && (
                    <div className="flex flex-wrap justify-center gap-2 px-6 pb-2">
                      {STARTERS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => void runSend(question)}
                          className="rounded-full border border-forest-200 bg-white px-3.5 py-2 text-xs text-forest-800 transition-colors hover:border-leaf-500/60 hover:bg-cream-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'rounded-br-sm bg-forest-800 text-cream-50'
                          : 'rounded-bl-sm border border-forest-100 bg-white text-ink-600',
                      )}
                    >
                      {message.pending && !message.content ? (
                        <span className="inline-flex items-center gap-2 text-ink-400">
                          <Spinner size="sm" /> Thinking…
                        </span>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-forest-100 p-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void runSend()
                    }
                  }}
                  rows={2}
                  placeholder={insectName ? `Ask about ${insectName}…` : 'Ask about insects, pests, IPM…'}
                  className="flex-1 resize-none rounded-xl border border-forest-200 bg-cream-50 px-4 py-3 text-sm text-forest-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                />
                <Button onClick={() => void runSend()} disabled={busy || !input.trim()}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-ink-400">
                AI answers can be wrong. Always confirm with a specialist before using chemicals.
              </p>
            </div>
          </Card>

          {activeConversation && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}