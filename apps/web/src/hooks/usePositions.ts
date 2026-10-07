import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPositions, logPosition, type PositionInput } from "../lib/api/hawq";

/** Server-backed demo positions; legacy hawq:positions local data is left untouched. */
export function usePositions(product?: PositionInput["product"]) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["hawq-positions"],
    queryFn: getPositions,
    refetchInterval: 30_000,
    retry: 1,
  });
  const mutation = useMutation({
    mutationFn: logPosition,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["hawq-positions"] }),
  });
  return {
    ...query,
    positions: (query.data ?? []).filter(
      (position) => !product || position.product === product,
    ),
    log: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
  };
}
