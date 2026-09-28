import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ActionName, ActionParams, ActionResults } from "@dentiva/shared";
import { useToast } from "@dentiva/ui";
import { callConsole, ConsoleApiError, errorMessage } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => {
        if (err instanceof ConsoleApiError && err.code !== "network" && err.code !== "internal") return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

/** Kunci cache: [aksi, params]. Invalidate berdasarkan prefiks aksi (mis. "clinics."). */
export function queryKey<A extends ActionName>(action: A, params?: ActionParams<A>) {
  return [action, params ?? {}] as const;
}

export function useConsoleQuery<A extends ActionName>(
  action: A,
  params?: ActionParams<A>,
  options?: Omit<UseQueryOptions<ActionResults[A], ConsoleApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<ActionResults[A], ConsoleApiError>({
    queryKey: queryKey(action, params),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (callConsole as any)(action, params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

interface MutationOptions<A extends ActionName> {
  /** Prefiks aksi yang cache-nya dibuang setelah sukses, mis. ["clinics.", "dashboard."]. */
  invalidate?: string[];
  successMessage?: string | ((data: ActionResults[A]) => string);
  onSuccess?: (data: ActionResults[A]) => void;
  /** false = jangan tampilkan toast error otomatis (form menampilkan error per field). */
  toastError?: boolean;
}

export function useConsoleMutation<A extends ActionName>(action: A, opts: MutationOptions<A> = {}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<ActionResults[A], ConsoleApiError, ActionParams<A>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (params) => (callConsole as any)(action, params),
    onSuccess: async (data) => {
      if (opts.invalidate?.length) {
        await qc.invalidateQueries({
          predicate: (q) =>
            typeof q.queryKey[0] === "string" && opts.invalidate!.some((p) => (q.queryKey[0] as string).startsWith(p)),
        });
      }
      if (opts.successMessage) {
        const title = typeof opts.successMessage === "function" ? opts.successMessage(data) : opts.successMessage;
        toast({ title, variant: "success" });
      }
      opts.onSuccess?.(data);
    },
    onError: (err) => {
      if (opts.toastError === false && err.code === "invalid_params") return;
      toast({
        title: "Gagal",
        description: `${errorMessage(err)}${err.requestId ? ` (ref: ${err.requestId.slice(0, 8)})` : ""}`,
        variant: "error",
        duration: 7000,
      });
    },
  });
}
