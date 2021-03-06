import React from 'react';

import { Header, HeaderBackButton } from '../../../ui';
import { ROUTES } from '../../../model/providers';

export const AddDataSourceHeader: React.FC = () => {
  return (
    <Header
      startChildren={
        <HeaderBackButton
          to={ROUTES.DATA_SOURCES}
          title="Back to data-source"
        />
      }
      title=""
    />
  );
};
