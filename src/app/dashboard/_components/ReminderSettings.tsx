"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function ReminderSettings() {
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const { data: vapidPublicKey } = api.notifications.getVapidPublicKey.useQuery();
  const { data: settings, refetch } = api.notifications.getReminderSettings.useQuery();
  const subscribe = api.notifications.subscribe.useMutation();
  const setReminderHour = api.notifications.setReminderHour.useMutation({
    onSuccess: () => refetch(),
  });

  async function enableNotifications() {
    setError(null);
    if (!vapidPublicKey) {
      setError("Push notifications aren't configured on this server yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("This browser doesn't support push notifications.");
      return;
    }

    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was denied.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      await subscribe.mutateAsync({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enable notifications.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-semibold">Daily reminder</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        A nudge at your usual practice time — no account required, just this browser.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!settings?.hasSubscription && (
        <button
          type="button"
          onClick={enableNotifications}
          disabled={subscribing}
          className="mt-3 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {subscribing ? "Enabling…" : "Enable notifications"}
        </button>
      )}

      {settings?.hasSubscription && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label htmlFor="reminderHour">Remind me around</label>
          <select
            id="reminderHour"
            value={settings.reminderHour ?? ""}
            onChange={(e) =>
              setReminderHour.mutate({
                hour: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Not set</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
