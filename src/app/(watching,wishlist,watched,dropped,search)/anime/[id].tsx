import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/states';
import { AnimeDetailScreen } from '@/screens/anime-detail-screen';

export default function AnimeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);
  if (!Number.isInteger(animeId) || animeId <= 0) {
    return <EmptyState sf="questionmark.circle" md="help" title="Anime not found" />;
  }
  return <AnimeDetailScreen key={animeId} id={animeId} />;
}
