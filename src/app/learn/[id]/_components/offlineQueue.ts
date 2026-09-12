const QUEUE_KEY = "aira:pendingProgress";

export type QueuedAction =
  | { type: "saveWord"; payload: { word: string; lessonId?: string }; queuedAt: number }
  | {
      type: "completeLesson";
      payload: {
        lessonId: string;
        answers: number[];
        durationSeconds: number;
        timezone?: string;
      };
      queuedAt: number;
    };

/**
 * Offline tolerance for the reader (PRD §11): a dropped connection mid-lesson
 * must not lose word-saves or a completed lesson. Actions that fail to
 * reach the server queue here and get replayed on reconnect (see the
 * Reader component's `useEffect`), rather than silently disappearing.
 */
function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Best-effort: localStorage can be unavailable (private mode, quota).
  }
}

export function enqueue(action: QueuedAction) {
  writeQueue([...readQueue(), action]);
}

export function peekQueue(): QueuedAction[] {
  return readQueue();
}

export function removeFromQueue(queuedAt: number) {
  writeQueue(readQueue().filter((a) => a.queuedAt !== queuedAt));
}
