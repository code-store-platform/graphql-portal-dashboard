import React from 'react';
import { Controller } from 'react-hook-form';

import { CacheTransforms as Props } from '../../../types';
import {
  Checkbox,
  Col,
  FormGroup,
  FormLabel,
  HelpTooltipBlock,
  Input,
  OutlineButton,
  Row,
} from '../../../ui';
import { AddFieldArrayHeader } from '../../Form/AddFieldArrayHeader';
import { CacheTransformsInvalidateOperations } from './CacheTransformsInvalidateOperations';
import { CacheTransformTooltip } from './CacheTransformTooltip';
import { useStyles } from './useStyles';

const CACHE_KEY_HELPER_TEXT =
  'Default is {typeName}-{fieldName}-{argsHash}-{fieldNamesHash}';

export const CacheTransforms: React.FC<Props> = ({
  cache,
  onAddCache,
  onRemoveCache,
  register,
  errors,
  control,
}) => {
  const { formRow } = useStyles();

  return (
    <FormGroup title="Cache Settings">
      <FormLabel
        label="Enable cache invalidation through control API"
        control={
          <Controller
            name="invalidate_cache_through_control_api"
            control={control}
            defaultValue={false}
            render={(props) => <Checkbox {...props} color="primary" />}
          />
        }
      />
      <AddFieldArrayHeader title="Cache Rule" onAddClick={onAddCache} />
      {cache.map((cache: any, idx: number) => {
        return (
          <FormGroup key={`cacheTransform-${idx}`} title="Cache Transform">
            <Row spacing={2} className={formRow}>
              <Col xs={6}>
                <Input
                  ref={register()}
                  name={`cache[${idx}].field`}
                  label="Field"
                  error={!!errors?.cache?.[idx]?.field}
                  defaultValue={cache.field || undefined}
                  fullWidth
                  required
                  helperText="The Type and Field to apply cache too. You can use wildcards, for example Query.*"
                />
              </Col>
            </Row>
            <Row spacing={2} className={formRow}>
              <Col xs={6}>
                <Input
                  ref={register()}
                  name={`cache[${idx}].cacheKey`}
                  label="Custom cache key"
                  error={!!errors?.cache?.[idx]?.cacheKey}
                  defaultValue={cache.cacheKey || undefined}
                  helperText={
                    <HelpTooltipBlock
                      tooltip={<CacheTransformTooltip />}
                      placement="right"
                    >
                      {CACHE_KEY_HELPER_TEXT}
                    </HelpTooltipBlock>
                  }
                  fullWidth
                />
              </Col>
            </Row>
            <Row spacing={2} className={formRow}>
              <Col xs={6}>
                <Input
                  ref={register()}
                  name={`cache[${idx}].invalidate.ttl`}
                  label="TTL"
                  error={!!errors?.cache?.[idx]?.invalidate?.ttl}
                  defaultValue={cache.invalidate?.ttl || undefined}
                  fullWidth
                  helperText="Time-to-live of the cache, in seconds"
                />
              </Col>
            </Row>
            <CacheTransformsInvalidateOperations
              nestIndex={idx}
              control={control}
              errors={errors}
              register={register}
            />
            <Row spacing={2}>
              <Col xs={6}>
                <OutlineButton onClick={() => onRemoveCache(idx)}>
                  Remove Cache Rule
                </OutlineButton>
              </Col>
            </Row>
          </FormGroup>
        );
      })}
    </FormGroup>
  );
};
