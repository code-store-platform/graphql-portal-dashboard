import React, { MutableRefObject } from 'react';
import { QueryHook, Refetch } from '../Apollo';
import {
  ControlType,
  FieldArray,
  FieldArrayAppend,
  FieldArrayRemove,
  OnSubmit,
} from '../HookForm';
import { SelectOption } from '../Forms';
import { AnyTable, NOOP } from '../General';
import { UseTabsHook } from '../Tabs';
import { DataSource } from '../DataSource';
import GraphiQL, { Fetcher } from 'graphiql';
import { ApiDef, ApiDefAndGateways } from './data';
import { EditApiTab } from './components';
import {
  AdditionalResolverFormMethods,
  ApiDefFormMethods,
  CacheTransformFormMethods,
} from './forms';

export type UseApiByIdHook = () => Omit<
  ReturnType<QueryHook<ApiDefAndGateways>>,
  'data'
> &
  ReturnType<UseTabsHook> & {
    api: ApiDef;
    apiHealthCheckFailed: boolean;
    apiEndpoint: string;
  };

export type UseUpdateDataSourcesHook = (props: EditApiTab) => {
  onSubmit: OnSubmit;
  options: SelectOption[];
  connected: any[];
  onAddSource: NOOP;
  onRemoveSource(idx: number): NOOP;
  loading: boolean;
} & ControlType;

export type UseViewAPIHook = () => Omit<ReturnType<UseApiByIdHook>, 'api'> & {
  fetcher: Fetcher;
  refetch: Refetch | undefined;
  name: string;
  apiEndpoint: string;
  apiHealthCheckFailed: boolean;
  enabled: boolean;
  status: string;
};

export type UseMyAPIHook = () => ReturnType<QueryHook<ApiDef[]>> & {
  onDelete(api: ApiDef): NOOP;
  onUpdate(api: ApiDef): NOOP;
  onCreate: NOOP;
  onView(api: ApiDef): NOOP;
};

export type UseAPIViewSchemaHook = (fetcher: Fetcher) => { value: string };
export type UseAPIPlaygroundHook = () => {
  onRun(evt: React.MouseEvent<HTMLButtonElement>): void;
  editor: React.MutableRefObject<GraphiQL | null | undefined>;
};

export type UseDSPartHook = (
  params: Pick<ApiDefFormMethods, 'control' | 'watch' | 'setValue'> &
    Partial<Pick<ApiDefFormMethods, 'reset'>>
) => {
  options: SelectOption[];
  connected: DataSource[];
  sourceFields: FieldArray;
  onRemoveSource(idx: number): NOOP;
  onAddSource: NOOP;
  sourceTable: MutableRefObject<AnyTable>;
  loading: boolean;
};

export type UseIPFilteringHook = (
  params: Pick<ApiDefFormMethods, 'control'>
) => {
  allowedIP: FieldArray;
  addAllowedIP: FieldArrayAppend;
  removeAllowedIP: FieldArrayRemove;
  deniedIP: FieldArray;
  addDeniedIP: FieldArrayAppend;
  removeDeniedIP: FieldArrayRemove;
  enableIPFiltering: boolean;
};

export type UseWebhooksHook = (params: Pick<ApiDefFormMethods, 'control'>) => {
  hooks: FieldArray;
  addHook: FieldArrayAppend;
  removeHook: FieldArrayRemove;
};

export type UseCreateApiDefHook = () => Pick<
  ApiDefFormMethods,
  'register' | 'control' | 'errors'
> &
  Omit<
    ReturnType<UseDSPartHook>,
    'sourceTable' | 'sourceFields' | 'loading'
  > & {
    onSubmit: OnSubmit;
    tokenFields: FieldArray;
    loading: boolean;
    addToken: FieldArrayAppend;
    removeToken: FieldArrayRemove;
    disableSelectDatasources: boolean;
  } & ReturnType<UseIPFilteringHook> &
  ReturnType<UseWebhooksHook>;

export type UseUpdateGeneralHook = (
  props: EditApiTab
) => Pick<
  ReturnType<UseCreateApiDefHook>,
  | 'onSubmit'
  | 'register'
  | 'control'
  | 'errors'
  | 'loading'
  | 'tokenFields'
  | 'addToken'
  | 'removeToken'
>;

export type UseUpdateSchemaAndLimitsHook = (
  props: EditApiTab
) => Pick<
  ReturnType<UseCreateApiDefHook>,
  'register' | 'control' | 'errors'
> & { onSubmit: OnSubmit };

export type UseUpdateIPFilteringHook = (
  props: EditApiTab
) => Pick<ReturnType<UseCreateApiDefHook>, 'control' | 'errors' | 'register'> &
  ReturnType<UseIPFilteringHook> & { onSubmit: OnSubmit };

export type UseUpdateWebhooksHook = (
  props: EditApiTab
) => Pick<ReturnType<UseCreateApiDefHook>, 'control' | 'errors' | 'register'> &
  ReturnType<UseWebhooksHook> & { onSubmit: OnSubmit };

export type UseAdditionalResolverHook = (props: EditApiTab) => Pick<
  AdditionalResolverFormMethods,
  'register' | 'errors' | 'control'
> & {
  onSubmit: OnSubmit;
  resolvers: FieldArray;
  sources: DataSource[];
  onAddResolver: FieldArrayAppend;
  onRemoveResolver: FieldArrayRemove;
};

export type UseCacheHook = (props: EditApiTab) => Pick<
  CacheTransformFormMethods,
  'register' | 'errors' | 'control'
> & {
  onSubmit: OnSubmit;
  cache: FieldArray;
  onAddCache: FieldArrayAppend;
  onRemoveCache: FieldArrayRemove;
};

export type UseEnableApiHook = (props: { api: ApiDef; refetch: Refetch }) => {
  onChange(value: boolean): void;
  value: boolean;
  disabled: boolean;
};
