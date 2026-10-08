import { useLocalSearchParams } from 'expo-router';

import { CharacterSheet } from '@/screens/character-sheet';

export default function CharacterRoute() {
  const { id, name, image } = useLocalSearchParams<{ id: string; name?: string; image?: string }>();
  return <CharacterSheet key={id} id={Number(id)} initialName={name} initialImage={image} />;
}
