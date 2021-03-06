import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import { ROUTES, useAuth, useTourContext } from '../../model/providers';
import { ROLE_ADMIN } from '../../model/providers/Auth/constants';
import { Content } from '../Content';
import { DataSources } from '../DataSources';
import { Dashboard } from '../Dashboard';
import { GatewayNodes } from '../GatewayNodes';
// import { GlobalSettings } from '../GlobalSettings';
import { ApiDefs } from '../ApiDefs';
import { Sidebar } from '../Sidebar';
import { Users } from '../Users';
import { GatewayLogs } from '../GatewayLogs';
// import { Webhooks } from '../Webhooks';
import { ApiMetrics } from '../ApiMetrics';
import { RoleProtectedComponent } from '../RoleProtectedComponent';
import { ApisActivity } from '../ApisActivity';
import { Profile } from '../Profile';
import { HotKeys } from '../HotKeys';

export const ProtectedRoutes: React.FC = () => {
  const { accessToken } = useAuth();
  const { tour } = useTourContext();

  if (!accessToken) return <Redirect to={ROUTES.LOGIN} />;

  return (
    <>
      <Sidebar />
      <Content>
        <Switch>
          <Route path="/" exact>
            <Redirect to={ROUTES.DASHBOARD} />
          </Route>
          <Route path={ROUTES.DASHBOARD}>
            <Dashboard />
          </Route>
          <Route path={ROUTES.API_METRICS}>
            <ApiMetrics />
          </Route>
          <Route path={ROUTES.APIS}>
            <ApiDefs />
          </Route>
          <Route path={ROUTES.DATA_SOURCES}>
            <DataSources />
          </Route>
          <Route path={ROUTES.APIS_ACTIVITY}>
            <ApisActivity />
          </Route>
          <Route path={ROUTES.LOGS}>
            <RoleProtectedComponent
              Component={GatewayLogs}
              roles={[ROLE_ADMIN]}
              redirectTo={ROUTES.MAIN}
            />
          </Route>
          <Route path={ROUTES.PROFILE}>
            <Profile />
          </Route>
          <Route path={ROUTES.USERS}>
            <RoleProtectedComponent
              Component={Users}
              roles={[ROLE_ADMIN]}
              redirectTo={ROUTES.MAIN}
            />
          </Route>
          <Route path={ROUTES.NODES}>
            <GatewayNodes />
          </Route>
        </Switch>
      </Content>
      {!tour.isStarted && <HotKeys />}
    </>
  );
};
