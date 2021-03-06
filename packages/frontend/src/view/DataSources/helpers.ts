import {
  AVAILABLE_HANDLERS,
  HANDLERS_DESCRIPTIONS,
  HANDLERS_LABELS,
  HANDLERS_WITH_OMITTED_HANDLER_PROP,
} from '../../presenter/DataSources/constants';
import { getHandlerKey } from '../../presenter/DataSources/helpers';
import { DataSource } from '../../types';
import {
  ADD_SOURCE_STEPS,
  ADD_SOURCE_STEPS_WITH_CONFIGURATION,
} from './constants';
import { compose, getProp, getObjPropOr } from '../../utils';

export const getError = (errors: any) => (field: string) => !!errors?.[field];

/**
 * Formats the title of connector according to the mapping.
 * @param title Original Mesh Input Handler title
 */
export const formatHandlerTitle = (title: string = ''): string =>
  HANDLERS_LABELS[title] ?? title.replace('Handler', '');

/**
 * Formats the description of connector according to the mapping.
 * @param title Original Mesh Input Handler title
 * @param description Original description of the handler
 */
export const formatHandlerDescription = (
  title: string,
  description = ''
): string => HANDLERS_DESCRIPTIONS[title] ?? description;

export const formatHandlerType: (handler: DataSource) => string = compose(
  getProp('title'),
  getObjPropOr(AVAILABLE_HANDLERS, {}),
  getHandlerKey
);

export const getSourceSteps = (handler: string) => {
  return HANDLERS_WITH_OMITTED_HANDLER_PROP.includes(handler)
    ? ADD_SOURCE_STEPS
    : ADD_SOURCE_STEPS_WITH_CONFIGURATION;
};
