export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LessonType = "MINI_STORY" | "GRADED_READER" | "PODCAST" | "NEWS" | "IMPORTED";
export type SourceType = "IN_HOUSE" | "LICENSED" | "IMPORTED";

export type SegmentDraft = {
  order: number;
  text: string;
  startMs?: number | null;
  endMs?: number | null;
};

export type QuestionDraft = {
  order: number;
  prompt: string;
  choices: string[];
  correctIndex: number;
};

export type LessonFormValues = {
  title: string;
  level: Level;
  type: LessonType;
  sourceType: SourceType;
  topicTags: string[];
  bodyText: string;
  translation: string;
  audioUrl: string;
  coverImageUrl: string;
  segments: SegmentDraft[];
  questions: QuestionDraft[];
};

export const EMPTY_LESSON: LessonFormValues = {
  title: "",
  level: "A1",
  type: "MINI_STORY",
  sourceType: "IN_HOUSE",
  topicTags: [],
  bodyText: "",
  translation: "",
  audioUrl: "",
  coverImageUrl: "",
  segments: [],
  questions: [],
};
