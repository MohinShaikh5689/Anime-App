import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { memo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { type SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { IncrementButton, Progress } from '@/components/controls';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/motion';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/rating-stars';
import { useAnimeHref } from '@/components/tab-context';
import { describeAnime } from '@/lib/anilist';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';
const RADIUS = isIOS ? 20 : 24;

/**
 * A library row. Swipe right for "+1 episode" (or to start a wishlist show),
 * swipe left to mark it finished.
 */
export const EntryRow = memo(function EntryRow({ entry }: { entry: LibraryEntry }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const swipeable = useRef<SwipeableMethods>(null);
  const increment = useLibrary((s) => s.incrementProgress);
  const setStatus = useLibrary((s) => s.setStatus);

  const finished = entry.episodes != null && entry.progress >= entry.episodes;
  const canIncrement = entry.status === 'watching' && !finished;
  const canAdvance = (entry.status === 'watching' && !finished) || entry.status === 'wishlist';
  const canFinish = entry.status !== 'watched';
  const showProgress = entry.status === 'watching' || entry.status === 'dropped';

  const advance = () => {
    if (entry.status === 'wishlist') setStatus(entry, 'watching');
    else increment(entry.id);
  };

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={1.6}
      leftThreshold={72}
      rightThreshold={72}
      overshootFriction={8}
      containerStyle={styles.swipe}
      renderLeftActions={
        canAdvance
          ? (progress) => (
              <SwipeAction
                progress={progress}
                side="left"
                color={colors.status.watching as string}
                sf={entry.status === 'wishlist' ? 'play.fill' : 'plus'}
                md={entry.status === 'wishlist' ? 'play_arrow' : 'add'}
                label={entry.status === 'wishlist' ? 'Start' : '+1 Ep'}
              />
            )
          : undefined
      }
      renderRightActions={
        canFinish
          ? (progress) => (
              <SwipeAction
                progress={progress}
                side="right"
                color={colors.status.watched as string}
                sf="checkmark"
                md="check"
                label="Finished"
              />
            )
          : undefined
      }
      onSwipeableWillOpen={(direction) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (direction === SwipeDirection.RIGHT) advance();
        else setStatus(entry, 'watched');
        setTimeout(() => swipeable.current?.close(), 180);
      }}>
      <Link href={href(entry.id)} asChild>
        <PressableScale scaleTo={0.98} style={[styles.row, { backgroundColor: colors.surface }]}>
          <Poster uri={entry.coverUrl} color={entry.coverColor} width={64} />
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {entry.title}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {describeAnime(entry)}
            </Text>
            {showProgress ? (
              <View style={styles.progress}>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  Episode {entry.progress}
                  {entry.episodes ? ` of ${entry.episodes}` : ''}
                </Text>
                <Progress value={entry.progress} total={entry.episodes} color={colors.status[entry.status]} />
              </View>
            ) : entry.status === 'watched' ? (
              <View style={styles.progress}>
                <RatingStars value={entry.rating} size={14} />
              </View>
            ) : null}
          </View>
          {canIncrement ? (
            <IncrementButton
              value={entry.progress}
              onPress={() => increment(entry.id)}
              accessibilityLabel={`Mark episode ${entry.progress + 1} of ${entry.title} as watched`}
            />
          ) : null}
        </PressableScale>
      </Link>
    </ReanimatedSwipeable>
  );
});

function SwipeAction({
  progress,
  side,
  color,
  sf,
  md,
  label,
}: {
  progress: SharedValue<number>;
  side: 'left' | 'right';
  color: string;
  sf: React.ComponentProps<typeof Icon>['sf'];
  md: React.ComponentProps<typeof Icon>['md'];
  label: string;
}) {
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], 'clamp') }],
  }));
  return (
    <View style={[styles.action, side === 'left' ? styles.actionLeft : styles.actionRight]}>
      <Animated.View style={[styles.actionBubble, { backgroundColor: color }, animated]}>
        <Icon sf={sf} md={md} size={20} color="#FFFFFF" />
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipe: { marginHorizontal: 16, borderRadius: RADIUS, overflow: 'visible' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.heading, fontSize: isIOS ? 17 : 16 },
  meta: { fontFamily: Fonts.label, fontSize: 13 },
  progress: { marginTop: 6, gap: 5 },
  action: { width: 96, justifyContent: 'center' },
  actionLeft: { alignItems: 'flex-start', paddingLeft: 8 },
  actionRight: { alignItems: 'flex-end', paddingRight: 8 },
  actionBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: { fontFamily: Fonts.heading, fontSize: 12, color: '#FFFFFF' },
});
