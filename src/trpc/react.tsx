"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

export const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // React Query's default `networkMode: "online"` *pauses* queries
          // and mutations while the browser reports offline, rather than
          // letting them fail — so a genuinely-offline word-save (not just a
          // failed request while still "online") would never hit `onError`,
          // never reach our own localStorage queue (offlineQueue.ts), and
          // the "will sync once you're back online" banner would never show.
          // This app already has its own offline-tolerant queue + reconnect
          // flush (Reader.tsx, PRD §11); "always" lets requests actually
          // attempt and fail fast so that mechanism is the only one in play,
          // instead of silently doubling up with React Query's own pause.
          queries: { networkMode: "always" },
          mutations: { networkMode: "always" },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
