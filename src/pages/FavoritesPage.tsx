import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoveRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { InsectCard } from '@/components/insects/InsectCard'
import { fetchFavorites, removeFavorite } from '@/services/favorites'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { InsectListItem } from '@/services/knowledge'

export function FavoritesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchFavorites(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  const removeMutation = useMutation({
    mutationFn: (insectId: string) => removeFavorite(user?.id ?? '', insectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  if (!user) return null

  if (!isSupabaseConfigured) {
    return (
      <div className="border-t border-forest-100 p-4">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to view favorites."
        />
      </div>
    )
  }

  const items = (query.data ?? []).map((row) => {
    const item: InsectListItem = {
      ...row.insect,
      order_name: null,
      family_name: null,
      featured: null,
    }
    return { item, favoriteId: row.id }
  })

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Favorites</h1>
        <p className="mt-1 text-sm text-ink-400">
          Your saved species for quick reference. Use the star on any species page to save it.
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Star an insect species you want to keep close at hand."
          icon={<Star className="h-10 w-10" aria-hidden="true" />}
          action={
            <span className="inline-flex items-center gap-2 text-sm text-ink-400">
              Browse the museum <MoveRight className="h-4 w-4" aria-hidden="true" />
            </span>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ item, favoriteId }) => (
            <div key={favoriteId} className="flex flex-col gap-2">
              <InsectCard insect={item} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMutation.mutate(item.id)}
                disabled={removeMutation.isPending}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                Remove from favorites
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}