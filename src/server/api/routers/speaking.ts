import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { isAtLeast, type Level } from "@/server/level-estimate";
import { saveUpload } from "@/server/storage";

/** Recorded client-side via MediaRecorder — these are the mime types browsers actually produce. */
const RECORDING_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
] as const;
const EXTENSION_BY_MIME: Record<(typeof RECORDING_MIME_TYPES)[number], string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/wav": ".wav",
};

/**
 * A short spoken response is capped client-side (SpeakingPrompt.tsx, ~30s),
 * but this is the real limit: base64 JSON is a poor fit for large binaries,
 * and this keeps a request from being an arbitrary-size upload vector.
 */
const MAX_RECORDING_BYTES = 5_000_000;

export const speakingRouter = createTRPCRouter({
  /**
   * "Speaking activation" (PRD §7 V2): record a short spoken response to a
   * lesson, unlocked at B1+. Record-and-playback only, deliberately no
   * transcription/scoring — see SpokenResponse's doc comment in
   * schema.prisma for why.
   */
  submit: publicProcedure
    .input(
      z.object({
        lessonId: z.string(),
        audioBase64: z.string().min(1),
        mimeType: z.enum(RECORDING_MIME_TYPES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = ctx.userId;

      const levelEstimate = await ctx.db.levelEstimate.findUnique({ where: { userId } });
      const learnerLevel: Level = (levelEstimate?.level as Level | undefined) ?? "A1";
      if (!isAtLeast(learnerLevel, "B1")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Speaking practice unlocks once you reach B1.",
        });
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(input.audioBase64, "base64");
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid recording data." });
      }
      if (buffer.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Recording is empty." });
      }
      if (buffer.length > MAX_RECORDING_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Recording is too long." });
      }

      const extension = EXTENSION_BY_MIME[input.mimeType];
      const file = new File([new Uint8Array(buffer)], `recording${extension}`, {
        type: input.mimeType,
      });
      const { url } = await saveUpload("recording", file);

      return ctx.db.spokenResponse.create({
        data: { userId, lessonId: input.lessonId, audioUrl: url },
      });
    }),

  listForLesson: publicProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.spokenResponse.findMany({
        where: { userId: ctx.userId, lessonId: input.lessonId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
