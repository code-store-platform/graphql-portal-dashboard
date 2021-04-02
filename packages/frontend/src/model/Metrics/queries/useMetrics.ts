import { useQuery, gql } from '@apollo/client';

export const QUERY_METRICS = gql`
  query getChunkedAPIMetrics($chunks: [Timestamp], $filters: MetricFilter!) {
    getChunkedAPIMetrics(chunks: $chunks, filters: $filters) {
      chunk
      count
      avgLatency
      successes
      failures
    }
  }
`;

export const useMetricsQuery = (apiDef: string | undefined, chunks: Date[]) => {
  const { data, loading, error } = useQuery(QUERY_METRICS, {
    variables: {
      chunks,
      filters: {
        apiDef,
      },
    },
  });

  return {
    data: data?.getChunkedAPIMetrics,
    loading,
    error,
    // refetch: (variables: APIMetricsRefetch) =>
    //   refetch({
    //     filters: {
    //       apiDef,
    //     },
    //     chunks: variables.chunks,
    //   }),
  };
};
