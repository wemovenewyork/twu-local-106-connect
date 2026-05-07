import { prisma } from "@/lib/prisma";
import { sendPush, PushPayload } from "@/lib/pushNotify";

export type { PushPayload };

const BATCH_SIZE = 50;

/**
 * Notification categories. When a category is passed to notifyUser/notifyMany,
 * recipients with matching opt-outs in NotificationPreference are silenced.
 *
 *   - undefined category: bypass preference checks (legacy / system-critical)
 */
export type NotificationCategory =
  | "contract"
  | "safety"
  | "rally"
  | "news"
  | "benefit"
  | "swapMatch"
  | "systemAlert";

const CATEGORY_FIELD: Record<NotificationCategory, keyof PrefRow> = {
  contract: "contractEnabled",
  safety: "safetyEnabled",
  rally: "rallyEnabled",
  news: "newsEnabled",
  benefit: "benefitEnabled",
  swapMatch: "swapMatchEnabled",
  systemAlert: "systemAlertEnabled",
};

interface PrefRow {
  userId: string;
  pushEnabled: boolean;
  contractEnabled: boolean;
  safetyEnabled: boolean;
  rallyEnabled: boolean;
  newsEnabled: boolean;
  benefitEnabled: boolean;
  swapMatchEnabled: boolean;
  systemAlertEnabled: boolean;
}

/**
 * Filter a list of user IDs against their notification preferences.
 * Users with no preference record default to opted-in.
 * Returns only IDs that should receive a notification of this category.
 */
async function filterByPreferences(
  userIds: string[],
  category: NotificationCategory
): Promise<string[]> {
  if (!userIds.length) return userIds;
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: { in: userIds } },
    });
    const byId = new Map<string, PrefRow>(prefs.map(p => [p.userId, p as unknown as PrefRow]));
    return userIds.filter(id => {
      const p = byId.get(id);
      if (!p) return true; // no record = default-on
      if (!p.pushEnabled) return false;
      const flag = p[CATEGORY_FIELD[category]] as unknown as boolean;
      return flag !== false;
    });
  } catch {
    // On any error, fall back to sending — never silently lose notifications.
    return userIds;
  }
}

async function shouldNotifyUser(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  const allowed = await filterByPreferences([userId], category);
  return allowed.length === 1;
}

/** Persist a single in-app notification record. Non-fatal. */
async function persistNotification(userId: string, payload: PushPayload): Promise<void> {
  // Reject non-relative URLs — notification URLs must stay on-domain.
  const url = payload.url ?? null;
  if (url !== null && !url.startsWith("/")) return;
  try {
    await prisma.notification.create({
      data: { userId, type: "push", title: payload.title, body: payload.body, url },
    });
  } catch { /* never break the main request */ }
}

/** Persist in-app notification records for many users at once. Non-fatal. */
async function persistNotifications(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  const url = payload.url ?? null;
  if (url !== null && !url.startsWith("/")) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId, type: "push", title: payload.title, body: payload.body, url,
      })),
    });
  } catch { /* never break the main request */ }
}

/**
 * Send a push notification to all registered devices for a user
 * and persist an in-app notification record.
 *
 * If `category` is supplied, the user's NotificationPreference is consulted;
 * when push or the category is muted, the notification is silenced entirely
 * (no push, no in-app entry). Pass undefined for system-critical sends that
 * should bypass preferences.
 *
 * Silently ignores failures so callers don't need to handle errors.
 */
export async function notifyUser(
  userId: string,
  payload: PushPayload,
  category?: NotificationCategory
): Promise<void> {
  if (category && !(await shouldNotifyUser(userId, category))) return;
  await persistNotification(userId, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
  } catch { }
}

/**
 * Send push notification to a user with email fallback,
 * and persist an in-app notification record.
 */
export async function notifyUserWithEmailFallback(
  userId: string,
  payload: PushPayload,
  emailSubject: string,
  emailHtml: string,
  category?: NotificationCategory
): Promise<void> {
  if (category && !(await shouldNotifyUser(userId, category))) return;
  await persistNotification(userId, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length > 0) {
      await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email && !user.email.includes("@deleted.invalid")) {
        const { sendEmail } = await import("@/lib/email");
        try {
          await sendEmail(user.email, emailSubject, emailHtml);
        } catch (e) {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureException(e, {
            tags: { source: "notify-email-fallback" },
            extra: { userId },
          });
        }
      }
    }
  } catch (e) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(e, {
      tags: { source: "notify-user-with-fallback" },
      extra: { userId },
    });
  }
}

/**
 * Fan-out push notifications to many users efficiently.
 * Persists in-app notification records for all users (even those without push subs).
 * Processes push in batches of BATCH_SIZE to avoid serverless timeout.
 *
 * If `category` is supplied, recipients are filtered against their
 * NotificationPreference: muted users get no push and no in-app entry.
 *
 * Silently ignores failures.
 */
export async function notifyMany(
  userIds: string[],
  payload: PushPayload,
  category?: NotificationCategory
): Promise<void> {
  if (!userIds.length) return;
  const allowed = category ? await filterByPreferences(userIds, category) : userIds;
  if (!allowed.length) return;
  await persistNotifications(allowed, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: allowed } },
    });
    if (!subs.length) return;
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(sub => sendPush(sub, payload)));
    }
  } catch { }
}
