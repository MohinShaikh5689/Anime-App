import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const LIST_STATUSES = ['watching', 'wishlist', 'watched', 'dropped'] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export type ListMeta = {
  status: ListStatus;
  title: string;
  /** Short verb used on buttons, e.g. "Add to Watching". */
  action: string;
  sf: SFSymbol;
  sfSelected: SFSymbol;
  md: AndroidSymbol;
  emptyTitle: string;
  emptyBody: string;
};

export const LISTS: Record<ListStatus, ListMeta> = {
  watching: {
    status: 'watching',
    title: 'Watching',
    action: 'Watching',
    sf: 'play.circle',
    sfSelected: 'play.circle.fill',
    md: 'play_circle',
    emptyTitle: 'Nothing in progress',
    emptyBody: 'Start a show from your wishlist or find something new in Search.',
  },
  wishlist: {
    status: 'wishlist',
    title: 'Wishlist',
    action: 'Wishlist',
    sf: 'bookmark',
    sfSelected: 'bookmark.fill',
    md: 'bookmark',
    emptyTitle: 'Your wishlist is empty',
    emptyBody: 'Save anime you plan to watch and they will show up here.',
  },
  watched: {
    status: 'watched',
    title: 'Watched',
    action: 'Watched',
    sf: 'checkmark.circle',
    sfSelected: 'checkmark.circle.fill',
    md: 'check_circle',
    emptyTitle: 'No completed anime yet',
    emptyBody: 'Finished shows land here, ready for you to rate.',
  },
  dropped: {
    status: 'dropped',
    title: 'Dropped',
    action: 'Dropped',
    sf: 'xmark.circle',
    sfSelected: 'xmark.circle.fill',
    md: 'cancel',
    emptyTitle: 'Nothing dropped',
    emptyBody: 'Shows you gave up on are kept here, out of the way.',
  },
};

/** List names for comics: Reading and Read instead of Watching and Watched. */
const READING: Partial<Record<ListStatus, Partial<ListMeta>>> = {
  watching: {
    title: 'Reading',
    action: 'Reading',
    sf: 'book',
    sfSelected: 'book.fill',
    md: 'menu_book',
    emptyBody: 'Start a series from your wishlist or find something new in Search.',
  },
  watched: { title: 'Read', action: 'Read', emptyTitle: 'Nothing finished yet', emptyBody: 'Series you finish land here, ready for you to rate.' },
  wishlist: { emptyBody: 'Save series you plan to read and they will show up here.' },
  dropped: { emptyBody: 'Series you gave up on are kept here, out of the way.' },
};

export function listMeta(status: ListStatus, manga = false): ListMeta {
  return manga ? { ...LISTS[status], ...READING[status] } : LISTS[status];
}
