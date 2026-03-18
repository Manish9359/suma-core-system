import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useApiQuery<T>(key: string[], fetchFn: () => Promise<T>) {
  return useQuery({
    queryKey: key,
    queryFn: fetchFn,
    retry: 1,
    staleTime: 30000,
  });
}

export function useApiMutation<T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>,
  options?: { invalidateKeys?: string[][] }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
