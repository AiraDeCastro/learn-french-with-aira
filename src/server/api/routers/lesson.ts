import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const levelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const lessonTypeSchema = z.enum([
  "MINI_STORY",
  "GRADED_READER",
  "PODCAST",
  "NEWS",
  "IMPORTED",
]);
const sourceTypeSchema = z.enum(["IN_HOUSE", "LICENSED", "IMPORTED"]);

const segmentInput = z.object({
  order: z.number().int().min(0),
  startMs: z.number().int().min(0).nullable().optional(),
  endMs: z.number().int().min(0).nullable().optional(),
  text: z.string().min(1),
});

const questionInput = z.object({
  order: z.number().int().min(0).default(0),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

const lessonInput = z.object({
  title: z.string().min(1),
  level: levelSchema,
  type: lessonTypeSchema,
  sourceType: sourceTypeSchema.default("IN_HOUSE"),
  topicTags: z.array(z.string()).default([]),
  bodyText: z.string().min(1),
  translation: z.string().optional(),
  audioUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  segments: z.array(segmentInput).default([]),
  questions: z.array(questionInput).default([]),
});

/**
 * No auth gate yet — see TASKS.md M1 follow-up: these mutations need to be
 * restricted to an authenticated admin role before the admin panel ships
 * anywhere public. Fine for local content-authoring work in the meantime.
 */
export const lessonRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.lesson.findMany({
      orderBy: { createdAt: "desc" },
      include: { segments: true, questions: true },
    }),
  ),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) =>
    ctx.db.lesson.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        segments: { orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" } },
      },
    }),
  ),

  create: publicProcedure.input(lessonInput).mutation(({ ctx, input }) => {
    const { segments, questions, ...lessonData } = input;
    return ctx.db.lesson.create({
      data: {
        ...lessonData,
        segments: { create: segments },
        questions: { create: questions },
      },
    });
  }),

  update: publicProcedure
    .input(lessonInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, segments, questions, ...lessonData } = input;

      // Simplest-correct approach for a form that resubmits its full list
      // each time: replace the child rows wholesale in one transaction.
      return ctx.db.$transaction(async (tx) => {
        await tx.transcriptSegment.deleteMany({ where: { lessonId: id } });
        await tx.comprehensionQuestion.deleteMany({ where: { lessonId: id } });
        return tx.lesson.update({
          where: { id },
          data: {
            ...lessonData,
            segments: { create: segments },
            questions: { create: questions },
          },
        });
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.lesson.delete({ where: { id: input.id } })),
});
