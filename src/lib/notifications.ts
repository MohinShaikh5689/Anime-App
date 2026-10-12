/**
 * Shared local-notification setup: the expo-notifications module (when this build has
 * it), the Android channel, permission, and an immediate-notification helper. Used by
 * episode alerts (scheduled ahead) and chapter alerts (sent when found).
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications needs its native module, which builds made before this feature
 * don't have. Load it only when present so those builds keep working without alerts.
 */
export const Notifications: NotificationsModule | null = (() => {
  if (!requireOptionalNativeModule('ExpoNotificationScheduler')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
})();

export const alertsSupported = Notifications != null;

export const CHANNEL = 'new-episodes';

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureChannel() {
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'New episodes and chapters',
    description: 'When something you are watching or reading gets a new episode or chapter',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Shows a notification right away (used for new-chapter alerts). */
export async function notifyNow(id: string, content: { title: string; body: string; data?: Record<string, unknown> }) {
  if (!Notifications || !(await hasPermission())) return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { ...content, sound: 'default' },
    trigger: { channelId: CHANNEL },
  });
  return true;
}

export async function hasPermission() {
  if (!Notifications) return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Asks for notification permission. Returns whether alerts can be shown. */
export async function requestAlertPermission() {
  if (!Notifications) return false;
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
