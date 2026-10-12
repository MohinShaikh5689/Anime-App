/**
 * "Up Next" home screen and Lock Screen widget (iOS, via expo-widgets).
 *
 * The function marked 'widget' is compiled into a separate bundle that runs inside the
 * widget extension, so it can't use hooks, imports at runtime or anything outside its
 * own body: everything comes in through `props` (written by the app, see
 * `lib/widget-sync.ts`) and `environment`. The imports below only give it types; the
 * widget runtime provides the same components and modifiers as globals.
 */
import { HStack, Image, Link, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  opacity,
  padding,
  resizable,
  tint,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';

export type UpNextItem = {
  id: number;
  title: string;
  /** file:// URL of the cover saved in the shared widgets directory, or null. */
  cover: string | null;
  /** The show's accent colour (hex). */
  color: string;
  /** The next episode to watch. */
  episode: number;
  /** When that episode airs (ms), or null if it's already out. */
  airingAt: number | null;
  /** Episodes already out and unwatched, not counting `episode` once it airs. */
  behind: number;
  progress: number;
  total: number | null;
  /** Last time the entry changed (ms), to order shows you're in the middle of. */
  touched: number;
};

export type UpNextProps = { items: UpNextItem[] };

export const UpNextLayout = (props: UpNextProps, environment: WidgetEnvironment) => {
  'widget';
  const now = environment.date.getTime();
  const family = environment.widgetFamily;
  const home = 'animetracker://';
  const link = (id: number) => 'animetracker://anime/' + id;

  // An episode counts as out once its air time has passed, even between app refreshes.
  // The gallery preview and placeholder render without props.
  const items = (props.items ?? [])
    .map((it) => {
      const out = it.airingAt == null || it.airingAt <= now;
      return { ...it, out, ready: out ? Math.max(1, it.behind) : 0 };
    })
    .sort((a, b) => {
      if (a.out !== b.out) return a.out ? -1 : 1;
      if (a.out) return b.touched - a.touched;
      return (a.airingAt ?? 0) - (b.airingAt ?? 0);
    });

  const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const status = (it: (typeof items)[number], size: number, color: string) =>
    it.out ? (
      <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(color), lineLimit(1)]}>
        {it.ready > 1 ? 'Ep ' + it.episode + ' · ' + it.ready + ' to watch' : 'Ep ' + it.episode + ' · Out now'}
      </Text>
    ) : (
      <HStack spacing={3}>
        <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(color)]}>{'Ep ' + it.episode + ' in'}</Text>
        <Text
          date={new Date(it.airingAt ?? now)}
          dateStyle="relative"
          modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(color), lineLimit(1)]}
        />
      </HStack>
    );

  const cover = (it: (typeof items)[number], width: number, radius: number) =>
    it.cover ? (
      <Image
        uiImage={it.cover}
        modifiers={[
          resizable(),
          // In Tinted and Clear home screens an image is drawn as a flat tint-coloured
          // block unless it opts out, which made covers solid white.
          widgetAccentedRenderingMode('fullColor'),
          frame({ width, height: Math.round(width * 1.42) }),
          clipShape('roundedRectangle', radius),
        ]}
      />
    ) : null;

  const background = (color: string) =>
    containerBackground(
      { type: 'linearGradient', colors: [color, '#0B0A14'], startPoint: { x: 0, y: 0 }, endPoint: { x: 0.9, y: 1 } },
      'widget'
    );

  // Lock Screen: one line, or a compact card.
  if (family === 'accessoryInline') {
    const first = items[0];
    return (
      <Text>
        {first
          ? first.out
            ? first.title + ' · Ep ' + first.episode
            : first.title + ' · Ep ' + first.episode + ' ' + timeOf(first.airingAt ?? now)
          : 'Nothing up next'}
      </Text>
    );
  }

  if (family === 'accessoryRectangular') {
    const first = items[0];
    if (!first) {
      return (
        <VStack alignment="leading" modifiers={[widgetURL(home)]}>
          <Text modifiers={[font({ size: 13, weight: 'bold' })]}>Up Next</Text>
          <Text modifiers={[font({ size: 12 }), opacity(0.7)]}>Add a show to Watching</Text>
        </VStack>
      );
    }
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(link(first.id))]}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), opacity(0.7)]}>UP NEXT</Text>
        <Text modifiers={[font({ size: 14, weight: 'bold' }), lineLimit(1)]}>{first.title}</Text>
        {status(first, 13, '#FFFFFF')}
      </VStack>
    );
  }

  if (items.length === 0) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[background('#5B47F0'), widgetURL(home)]}>
        <Text modifiers={[font({ size: 22, weight: 'black' }), foregroundStyle('#FFFFFF')]}>続</Text>
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>Nothing up next</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#FFFFFF'), opacity(0.75)]}>
          Add a show to Watching and it shows up here.
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    const it = items[0];
    return (
      <VStack alignment="leading" spacing={4} modifiers={[background(it.color), widgetURL(link(it.id))]}>
        <HStack alignment="top">
          {cover(it, 40, 7)}
          <Spacer />
          {/* Only one show fits; say how many more are waiting (medium and large list them). */}
          {items.length > 1 ? (
            <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle('#FFFFFF'), opacity(0.75)]}>
              {'+' + (items.length - 1) + ' more'}
            </Text>
          ) : (
            <Text modifiers={[font({ size: 15, weight: 'black' }), foregroundStyle('#FFFFFF'), opacity(0.6)]}>続</Text>
          )}
        </HStack>
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(2)]}>{it.title}</Text>
        {status(it, 12, '#FFFFFF')}
        {it.total ? (
          <ProgressView value={Math.min(1, it.progress / it.total)} modifiers={[tint('#FFFFFF'), padding({ top: 2 })]} />
        ) : null}
      </VStack>
    );
  }

  // Medium and large: a list, each row opening its show.
  const rows = items.slice(0, family === 'systemMedium' ? 3 : 6);
  const head = rows[0];
  return (
    <VStack alignment="leading" spacing={family === 'systemMedium' ? 6 : 10} modifiers={[background(head.color), widgetURL(home)]}>
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'heavy' }), foregroundStyle('#FFFFFF'), opacity(0.75)]}>UP NEXT</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'black' }), foregroundStyle('#FFFFFF'), opacity(0.6)]}>続</Text>
      </HStack>
      {rows.map((it) => (
        <Link key={it.id} destination={link(it.id)}>
          <HStack spacing={10}>
            {cover(it, family === 'systemMedium' ? 24 : 34, 5)}
            <VStack alignment="leading" spacing={1}>
              <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>
                {it.title}
              </Text>
              {status(it, 12, it.out ? '#FFD84D' : '#FFFFFF')}
            </VStack>
            <Spacer />
          </HStack>
        </Link>
      ))}
      <Spacer />
    </VStack>
  );
};
