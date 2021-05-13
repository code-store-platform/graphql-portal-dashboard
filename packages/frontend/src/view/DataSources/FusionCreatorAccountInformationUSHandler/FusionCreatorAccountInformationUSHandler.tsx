import React from 'react';
import { Controller } from 'react-hook-form';
import { Input, PrimaryButton } from '../../../ui';
import { useFusionCreatorAccountInformationUSHandler } from '../../../presenter/DataSources';
import { HandlerStep } from '../../../types';
import { HandlerCol, HandlerRow } from '../Layout';
import { getError } from '../helpers';

export const FusionCreatorAccountInformationUSHandler: React.FC<HandlerStep> = (
  props
) => {
  const {
    control,
    errors,
    onSubmit,
  } = useFusionCreatorAccountInformationUSHandler(props);
  const hasErrors = getError(errors);

  return (
    <form noValidate autoComplete="off" onSubmit={onSubmit}>
      <HandlerRow>
        <HandlerCol>
          <Controller
            as={Input}
            control={control}
            label="Authorization header name"
            required
            name="authorizationHeader"
            error={hasErrors('authorizationHeader')}
            fullWidth
          />
        </HandlerCol>
      </HandlerRow>
      <PrimaryButton type="submit">Save Handler</PrimaryButton>
    </form>
  );
};
