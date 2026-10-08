import { useLocalSearchParams } from 'expo-router';

import { ChaptersSheet } from '@/screens/chapters-sheet';

export default function ChaptersRoute() {
  const p = useLocalSearchParams<{
    id: string;
    title: string;
    titles?: string;
    country?: string;
    year?: string;
    finished?: string;
    total?: string;
    color?: string;
  }>();
  const id = Number(p.id);
  return (
    <ChaptersSheet
      key={id}
      title={p.title ?? ''}
      total={p.total ? Number(p.total) : null}
      color={p.color || null}
      target={{
        id,
        titles: p.titles ? p.titles.split('\n') : [p.title ?? ''],
        country: p.country || null,
        year: p.year ? Number(p.year) : null,
        finished: p.finished === '1',
      }}
    />
  );
}
