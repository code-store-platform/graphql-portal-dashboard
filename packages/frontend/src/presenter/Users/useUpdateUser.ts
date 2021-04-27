import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import vest, { test, enforce } from 'vest';
import { vestResolver } from '@hookform/resolvers/vest';

import { useFormErrors } from '../../model/Hooks';
import { useDialogs } from '../../model/providers';
import { isEmail } from '../validation';

const suite = vest.create('update_user', ({ email }) => {
  test('email', 'Email is required', () => {
    enforce(email).isNotEmpty();
  });

  test('email', 'Please enter correct Email', () => {
    isEmail(email);
  });
});

export const useUpdateUser = () => {
  const { dialogConfig } = useDialogs()!;
  const { user = {}, onSuccess, onCancel } = dialogConfig!;

  const { handleSubmit, errors, control, reset } = useForm({
    resolver: vestResolver(suite),
    mode: 'onSubmit',
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
    },
  });

  useFormErrors(errors);

  useEffect(() => {
    reset(user);
  }, [user.email, user.firstName, user.lastName, reset]);

  return {
    onSubmit: handleSubmit(onSuccess),
    errors,
    control,
    onCancel,
  };
};
