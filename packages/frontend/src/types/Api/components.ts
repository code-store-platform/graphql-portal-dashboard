import { Fetcher } from 'graphiql';
import { Refetch } from '../Apollo';
import { ControlType } from '../HookForm';
import { SelectOption } from '../Forms';
import { NOOP } from '../General';
import { DataSource } from '../DataSource';
import { ApiDef } from './data';
import {
  UseAdditionalResolverHook,
  UseCacheHook,
  UseCreateApiDefHook,
  UseIPFilteringHook,
} from './hooks';
import { TabOnChange } from '../Tabs';

export type ApiList = {
  list: ApiDef[];
  refetch: Refetch;
  onDelete: (api: ApiDef) => NOOP;
  onUpdate: (api: ApiDef) => NOOP;
  onView: (api: ApiDef) => NOOP;
};

export type EditApiTab = {
  api: ApiDef;
  refetch: Refetch;
};

export type ViewAPITab = {
  fetcher: Fetcher;
  name?: string;
};

export type ViewApiHeader = {
  name: string;
  apiEndpoint: string;
};

export type EditApiHeader = ViewApiHeader & EnableSwitch;

export type ApiGeneralForm = Pick<
  ReturnType<UseCreateApiDefHook>,
  'register' | 'control' | 'errors'
>;

export type ApiAuthenticationForm = Pick<
  ReturnType<UseCreateApiDefHook>,
  'register' | 'errors' | 'addToken' | 'removeToken' | 'tokenFields'
>;

export type ApiDataSourcesForm = ControlType & {
  options: SelectOption[];
  onAddSource(): void;
  connected: DataSource[];
  onRemoveSource(idx: number): NOOP;
  disableSelect?: boolean;
};

export type ApiSchemaForm = Pick<
  ReturnType<UseCreateApiDefHook>,
  'register' | 'control' | 'errors'
>;

export type APIIPForm = Pick<
  ReturnType<UseCreateApiDefHook>,
  'control' | 'errors' | 'register'
> &
  ReturnType<UseIPFilteringHook>;

export type APILimitsForm = Pick<
  ReturnType<UseCreateApiDefHook>,
  'register' | 'errors'
>;

export type EnableSwitch = {
  api: ApiDef;
  refetch: Refetch;
};

export type ReadyAPI = {
  tab: number;
  onChange: TabOnChange;
  fetcher: Fetcher;
  name: string;
};

export type InitializedAPI = {
  name: string;
  refetch: Refetch | undefined;
};

export type DeclinedAPI = {
  name: string;
};

export type HealthCheckFailedAPI = {
  name: string;
};

export type AdditionalResolvers = Omit<
  ReturnType<UseAdditionalResolverHook>,
  'onSubmit'
>;

export type AdditionalResolverArguments = Pick<
  AdditionalResolvers,
  'control' | 'errors' | 'register'
> & {
  nestIndex: number;
};

export type CacheTransforms = Omit<ReturnType<UseCacheHook>, 'onSubmit'>;

export type CacheTransformsInvalidateOperations = Pick<
  CacheTransforms,
  'control' | 'errors' | 'register'
> & {
  nestIndex: number;
};
