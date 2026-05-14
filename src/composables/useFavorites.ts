import { useLocalStorage } from '@vueuse/core'

// module-level singleton — 所有元件共享同一個 ref
const favorites = useLocalStorage<number[]>('artist-favorites', [])

export function useFavorites() {
  function isFavorite(id: number): boolean {
    return favorites.value.includes(id)
  }

  function toggleFavorite(id: number): void {
    if (isFavorite(id)) {
      favorites.value = favorites.value.filter(f => f !== id)
    } else {
      favorites.value = [...favorites.value, id]
    }
  }

  return { favorites, isFavorite, toggleFavorite }
}
