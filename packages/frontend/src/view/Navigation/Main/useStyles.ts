import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles(({ spacing, palette }: Theme) => ({
  group: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1.5),
  },
  groupName: {
    textTransform: 'uppercase',
    fontSize: '0.875rem',
    marginBottom: spacing(1),
    paddingLeft: spacing(2),
    color: palette.text.hint,
  },
  item: {
    textDecoration: 'none',
    display: 'block',
  },
  activeItem: {
    '& > button': {
      background: palette.action.hover,
      border: `1px solid ${palette.action.hover}`,
    },
  },
  button: {
    justifyContent: 'flex-start',
    border: `1px solid transparent`,
  },
}));
