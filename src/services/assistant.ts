import { tryGetSupabase } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationSummary {
  id: string
  created_at: string
  title?: string | null
  context_insect_id?: string | null
}

async function gatherInsectContext(query: string): Promise<string> {
  const supabase = tryGetSupabase()
  if (!supabase) return ''
  const parts: string[] = []

  const insectQuery = query.trim().slice(0, 80)
  if (insectQuery) {
    const { data: insects } = await supabase
      .from('insects')
      .select('common_name, scientific_name, order_id, is_pest, is_beneficial, description')
      .or(`common_name.ilike.%${insectQuery}%,scientific_name.ilike.%${insectQuery}%`)
      .limit(4)
    for (const insect of insects ?? []) {
      const row = insect as Record<string, unknown>
      parts.push(
        `Insect: ${String(row.common_name ?? '')} (${String(row.scientific_name ?? '')}) | order ${String(row.order_id ?? '')} | pest: ${Boolean(row.is_pest)} | beneficial: ${Boolean(row.is_beneficial)} | ${String(row.description ?? '').slice(0, 300)}`,
      )
    }

    const { data: crops } = await supabase
      .from('crops')
      .select('name, scientific_name, description')
      .ilike('name', `%${insectQuery}%`)
      .limit(3)
    for (const crop of crops ?? []) {
      const row = crop as Record<string, unknown>
      parts.push(
        `Crop: ${String(row.name ?? '')} (${String(row.scientific_name ?? '')}) | ${String(row.description ?? '').slice(0, 200)}`,
      )
    }

    const { data: symptoms } = await supabase
      .from('damage_symptoms')
      .select('name, category, description')
      .ilike('name', `%${insectQuery}%`)
      .limit(3)
    for (const symptom of symptoms ?? []) {
      const row = symptom as Record<string, unknown>
      parts.push(
        `Symptom: ${String(row.name ?? '')} [${String(row.category ?? '')}] | ${String(row.description ?? '').slice(0, 150)}`,
      )
    }
  }
  return parts.join('\n').slice(0, 4000)
}

export async function askAssistant(input: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  insectName?: string | null
}): Promise<{ reply: string; modelName: string }> {
  const lastUserMessage = [...input.messages].reverse().find((message) => message.role === 'user')
  const context = await gatherInsectContext(lastUserMessage?.content ?? '')

  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: input.messages,
      context,
      insectName: input.insectName ?? null,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'The assistant could not be reached. Please try again.')
  }

  const data = (await response.json()) as { reply: string; modelName: string }
  return data
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('ai_conversations')
    .select('id, created_at, title, context_insect_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as ConversationSummary[]
}

export async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ChatMessage[]
}

export async function createConversation(input: {
  userId: string
  title?: string
  contextInsectId?: string
}): Promise<string | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: input.userId,
      title: input.title?.slice(0, 120) ?? null,
      context_insect_id: input.contextInsectId ?? null,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return (data as { id: string }).id
}

export async function saveMessage(input: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
}): Promise<void> {
  const supabase = tryGetSupabase()
  if (!supabase) return
  await supabase.from('ai_messages').insert({
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
  })
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false

  // Verify ownership BEFORE deleting any child rows. ai_messages is keyed only
  // by conversation_id, so deleting first would let a caller remove another
  // user's messages by supplying an arbitrary conversation id.
  const { data: owned, error: ownerError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (ownerError || !owned) return false

  const { error: messageError } = await supabase
    .from('ai_messages')
    .delete()
    .eq('conversation_id', conversationId)
  if (messageError) return false

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)
  return !error
}
