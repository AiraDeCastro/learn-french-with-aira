import { LessonForm } from "../_components/LessonForm";

export default function NewLessonPage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">New lesson</h1>
      <LessonForm />
    </div>
  );
}
