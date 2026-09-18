"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

/** Auto-stops a recording at this length — "short spoken response" (PRD §7 V2), not an open-ended one. */
const MAX_RECORDING_SECONDS = 30;

const CANDIDATE_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
] as const;

function pickSupportedMimeType(): (typeof CANDIDATE_MIME_TYPES)[number] {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — only the payload is sent.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Couldn't read the recording."));
    reader.readAsDataURL(blob);
  });
}

/**
 * "Speaking activation" (PRD §7 V2): record a short spoken response to
 * activate passive vocabulary, unlocked at B1+. Record-and-playback only —
 * deliberately no transcription (see SpokenResponse's doc comment in
 * schema.prisma for why), so this is a practice mirror, not an assessment.
 */
export function SpeakingPrompt({ lessonId }: { lessonId: string }) {
  const utils = api.useUtils();
  const { data: recordings } = api.speaking.listForLesson.useQuery({ lessonId });
  const submit = api.speaking.submit.useMutation({
    onSuccess: () => utils.speaking.listForLesson.invalidate({ lessonId }),
  });

  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
        blobToBase64(blob)
          .then((audioBase64) => submit.mutateAsync({ lessonId, audioBase64, mimeType }))
          .catch(() => setError("Couldn't save that recording — try again."));
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      autoStopRef.current = setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1000);
    } catch {
      setError(
        "Couldn't access your microphone — check your browser's permission settings.",
      );
    }
  }

  function stopRecording() {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <section className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="mb-1 font-semibold">Practice speaking</h2>
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
        In your own words, summarize what you just read or heard — aim for{" "}
        {MAX_RECORDING_SECONDS} seconds. This is just for you to hear yourself back;
        nothing is scored or transcribed.
      </p>

      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
      >
        {isRecording ? "⏹ Stop recording" : "🎙 Record a response"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {previewUrl && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
            Your latest recording:
          </p>
          <audio controls src={previewUrl} className="w-full" />
        </div>
      )}

      {recordings && recordings.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
            Past recordings for this lesson:
          </p>
          <ul className="flex flex-col gap-2">
            {recordings.map((r) => (
              <li key={r.id}>
                <audio controls src={r.audioUrl} className="w-full" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
