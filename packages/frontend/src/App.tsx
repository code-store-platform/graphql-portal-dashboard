import { Switch, Route } from 'react-router-dom';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { Tour } from './view';

import {
  AuthProvider,
  DialogsProvider,
  Router,
  ROUTES,
  StateProvider,
  ThemeProvider,
  ToastProvider,
  TourProvider,
} from './model/providers';
import {
  ProtectedRoutes,
  Login,
  SignUp,
  ResetPassword,
  ResetPasswordRequest,
  ConfirmEmail,
} from './view';

function App() {
  return (
    <AuthProvider>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <StateProvider>
          <TourProvider>
            <Router>
              <ThemeProvider>
                <DialogsProvider>
                  <ToastProvider>
                    <Switch>
                      <Route path={ROUTES.CONFIRM_EMAIL}>
                        <ConfirmEmail />
                      </Route>
                      <Route path={ROUTES.RESET_PASSWORD_REQUEST}>
                        <ResetPasswordRequest />
                      </Route>
                      <Route path={ROUTES.RESET_PASSWORD}>
                        <ResetPassword />
                      </Route>
                      <Route path={ROUTES.LOGIN}>
                        <Login />
                      </Route>
                      <Route path={ROUTES.SIGN_UP}>
                        <SignUp />
                      </Route>
                      <Route path={ROUTES.MAIN}>
                        <ProtectedRoutes />
                      </Route>
                    </Switch>
                    <Tour />
                  </ToastProvider>
                </DialogsProvider>
              </ThemeProvider>
            </Router>
          </TourProvider>
        </StateProvider>
      </MuiPickersUtilsProvider>
    </AuthProvider>
  );
}

export default App;
