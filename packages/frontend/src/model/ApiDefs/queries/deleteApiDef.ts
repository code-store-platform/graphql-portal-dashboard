import { gql, useMutation } from '@apollo/client';
import { QUERY_API_DEFS } from './useApiDefs';

export const DELETE_API_DEF = gql`
  mutation deleteApiDef($id: ID!) {
    deleteApiDef(id: $id)
  }
`;

export const useDeleteApiDef = () => {
  return useMutation(DELETE_API_DEF, { refetchQueries: [{ query: QUERY_API_DEFS }] });
}