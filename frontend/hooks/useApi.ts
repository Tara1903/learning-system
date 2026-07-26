import useSWR, { SWRConfiguration, SWRResponse } from "swr";
import { apiFetch, ApiClientError } from "../utils/api";

const fetcher = <T>(url: string) => apiFetch<T>(url);

export function useApi<T>(
  url: string | null,
  config?: SWRConfiguration<T, ApiClientError>
): SWRResponse<T, ApiClientError> & { isLoading: boolean } {
  const result = useSWR<T, ApiClientError>(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...config,
  });

  return {
    ...result,
    isLoading: !result.data && !result.error && url !== null,
  };
}
