import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Admin</h1>
      <p className="mb-6 text-sm text-neutral-500">
        No access control yet — see TASKS.md M1 follow-up before this ships anywhere
        public.
      </p>
      <Link
        href="/admin/lessons"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Manage lessons →
      </Link>
    </div>
  );
}
