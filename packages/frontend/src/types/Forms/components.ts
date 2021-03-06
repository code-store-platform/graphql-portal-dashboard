import { ReactNode } from 'react';
import {
  SwitchProps,
  SelectProps,
  OutlinedInputProps,
  FormControlLabelProps,
} from '@material-ui/core';

import {
  FieldArray,
  FieldArrayAppend,
  FieldArrayRemove,
  GeneralFormMethods,
} from '../HookForm';
import { ObjectArrayItem, SelectOption, StringArrayItem } from './data';

export type Switch = Omit<SwitchProps, 'onChange'> & {
  value: boolean;
  onChange(value: boolean): void;
};

type FieldArrayComponent<T> = {
  name: string;
  title: string;
  onAdd: FieldArrayAppend;
  onRemove: FieldArrayRemove;
  fields: FieldArray<T>;
} & Pick<GeneralFormMethods, 'register' | 'errors'>;

export type ObjectArrayForm = FieldArrayComponent<ObjectArrayItem> & {
  objectSchema?: {
    [key: string]: {
      label?: string;
      helperText?: string;
    };
  };
};

export type ObjectArrayWithSelectForm = FieldArrayComponent<ObjectArrayItem> & {
  label?: string;
  helperText?: string;
  selectLabel?: string;
  options: SelectOption[];
  control: any;
};

export type StringArrayForm = FieldArrayComponent<StringArrayItem> & {
  valueLabel?: string;
};

export type AddFieldArrayHeader = {
  title: string;
  onAddClick: FieldArrayAppend;
};

export type FormGroup = { title: string };

type Option = {
  value: string | number | undefined;
  label: ReactNode;
};

export type Select = SelectProps & {
  options: Option[];
  fullWidth?: boolean;
  labelClassName?: string;
  helperText?: string;
};

export type PasswordInput = OutlinedInputProps & {
  label: React.ReactNode;
};

export type FormLabel = FormControlLabelProps;
