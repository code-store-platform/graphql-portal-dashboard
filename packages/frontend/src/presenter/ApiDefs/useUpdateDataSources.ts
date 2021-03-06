import { useForm } from 'react-hook-form';

import {
  UseUpdateDataSourcesHook,
  DataSource,
  AError,
  ApiDefForm,
} from '../../types';
import { useUpdateApiDef } from '../../model/ApiDefs/commands';
import { useToast } from '../../model/providers';
import { useDSPart } from './useDSPart';

export const useUpdateDataSources: UseUpdateDataSourcesHook = ({
  api,
  refetch,
}) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const {
    name,
    endpoint,
    authentication,
    playground,
    _id: id,
    sources,
    enabled,
  } = api;
  const { auth_header_name = '', auth_tokens = [] } = authentication || {};

  const { updateApiDef } = useUpdateApiDef({
    onCompleted() {
      refetch();
      showSuccessToast(`API ${name} successfully updated`);
    },
    onError({ message }: AError) {
      showErrorToast(message);
    },
  });

  const { handleSubmit, control, watch, setValue, reset } = useForm<ApiDefForm>(
    {
      reValidateMode: 'onSubmit',
      defaultValues: {
        source: '',
        sources: sources.map(({ name }: DataSource) => ({ value: name })),
      },
    }
  );

  const {
    options,
    connected,
    sourceFields,
    onAddSource,
    onRemoveSource,
    sourceTable,
    loading,
  } = useDSPart({ control, watch, setValue, reset });

  const onSubmit = () => {
    updateApiDef({
      variables: {
        id,
        apiDef: {
          name,
          endpoint,
          playground,
          authentication: { auth_header_name, auth_tokens },
        },
        sources: sourceFields.map(
          ({ value }: Record<string, string>) => sourceTable.current[value]._id
        ),
        enabled,
      },
    });
  };

  return {
    onSubmit: handleSubmit(onSubmit),
    control,
    options,
    connected,
    onAddSource,
    onRemoveSource,
    loading,
  };
};
