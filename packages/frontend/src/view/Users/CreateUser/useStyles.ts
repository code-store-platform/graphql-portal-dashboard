import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles(({ spacing }: Theme) => ({
  controller: {
    marginBottom: spacing(2),
  },
}));
