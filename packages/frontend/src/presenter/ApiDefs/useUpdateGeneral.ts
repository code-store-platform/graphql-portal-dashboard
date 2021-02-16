import { useForm, useFieldArray } from 'react-hook-form';
import vest, { test, enforce } from 'vest';
import { vestResolver } from '@hookform/resolvers/vest';

import { ApiDef, DataSource } from '../../types';
import { useUpdateApiDef } from '../../model/ApiDefs/commands';
import {
  arrayToFieldArray,
  arrayStringFromObjectArray,
} from '../DataSources/helpers';

const suite = vest.create(
  'create_new_api',
  ({ name, endpoint, authentication }) => {
    test('name', 'Name is required', () => {
      enforce(name).isNotEmpty();
    });

    test('endpoint', 'Endpoint is required', () => {
      enforce(endpoint).isNotEmpty();
    });

    test('endpoint', 'Endpoint should match pattern "^/"', () => {
      enforce(endpoint).matches(/^\//);
    });

    const { auth_header_name, auth_tokens = [] } = authentication;

    if (!!auth_header_name) {
      test('auth_tokens', 'Auth header tokens is required', () => {
        enforce(auth_tokens).isArray();
      });

      test('auth_tokens', 'Auth header tokens is required', () => {
        enforce(auth_tokens[0].value).isNotEmpty();
      });
    }

    if (auth_tokens.length > 0 && !!auth_tokens[0].value) {
      test(
        'authentication.auth_header_name',
        'Auth key header is required',
        () => {
          enforce(auth_header_name).isNotEmpty();
        }
      );
    }
  }
);

export const useUpdateGeneral = (api: ApiDef) => {
  const {
    _id: id,
    name,
    endpoint,
    authentication: { auth_header_name, auth_tokens },
    playground,
    sources,
    enabled,
  } = api;

  const { updateApiDef } = useUpdateApiDef();

  const { handleSubmit, control, errors } = useForm({
    reValidateMode: 'onSubmit',
    resolver: vestResolver(suite),
    defaultValues: {
      name,
      endpoint,
      authentication: {
        auth_header_name,
        auth_tokens: arrayToFieldArray(auth_tokens),
      },
    },
  });

  const {
    fields: tokenFields,
    append: addToken,
    remove: removeToken,
  } = useFieldArray({ control, name: 'authentication.auth_tokens' });

  const onSubmit = ({ authentication, name, endpoint }: any) => {
    const { auth_header_name, auth_tokens } = authentication;
    const auth = !!auth_header_name
      ? {
          authentication: {
            auth_header_name,
            auth_tokens: arrayStringFromObjectArray(auth_tokens),
          },
        }
      : {};
    updateApiDef({
      variables: {
        id,
        apiDef: {
          name,
          endpoint,
          playground,
          ...auth,
        },
        sources: sources.map(({ _id }: DataSource) => _id),
        enabled,
      },
    });
  };

  return {
    onSubmit: handleSubmit(onSubmit),
    control,
    errors,
    tokenFields,
    addToken,
    removeToken,
  };
};
