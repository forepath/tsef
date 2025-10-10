import { Injectable, inject } from '@angular/core';
import { LoginRequest, LogoutRequest, RefreshTokenRequest, UserProfile } from '@auth';
import { Action, Store } from '@ngrx/store';
import { Observable } from 'rxjs';

// Actions
export const AuthActions = {
  // Authentication actions
  LOGIN_REQUEST: '[Auth] Login Request',
  LOGIN_SUCCESS: '[Auth] Login Success',
  LOGIN_FAILURE: '[Auth] Login Failure',

  LOGOUT_REQUEST: '[Auth] Logout Request',
  LOGOUT_SUCCESS: '[Auth] Logout Success',
  LOGOUT_FAILURE: '[Auth] Logout Failure',

  REFRESH_TOKEN_REQUEST: '[Auth] Refresh Token Request',
  REFRESH_TOKEN_SUCCESS: '[Auth] Refresh Token Success',
  REFRESH_TOKEN_FAILURE: '[Auth] Refresh Token Failure',

  // User actions
  LOAD_USER_REQUEST: '[Auth] Load User Request',
  LOAD_USER_SUCCESS: '[Auth] Load User Success',
  LOAD_USER_FAILURE: '[Auth] Load User Failure',

  // State actions
  SET_LOADING: '[Auth] Set Loading',
  SET_ERROR: '[Auth] Set Error',
  CLEAR_ERROR: '[Auth] Clear Error',
  UPDATE_USER: '[Auth] Update User',
  SET_AUTHENTICATED: '[Auth] Set Authenticated',
} as const;

// Action creators
export class LoginRequestAction implements Action {
  readonly type = AuthActions.LOGIN_REQUEST;
  constructor(public payload: LoginRequest) {}
}

export class LoginSuccessAction implements Action {
  readonly type = AuthActions.LOGIN_SUCCESS;
  constructor(public payload: { user: UserProfile; token: string }) {}
}

export class LoginFailureAction implements Action {
  readonly type = AuthActions.LOGIN_FAILURE;
  constructor(public payload: { error: string }) {}
}

export class LogoutRequestAction implements Action {
  readonly type = AuthActions.LOGOUT_REQUEST;
  constructor(public payload?: LogoutRequest) {}
}

export class LogoutSuccessAction implements Action {
  readonly type = AuthActions.LOGOUT_SUCCESS;
}

export class LogoutFailureAction implements Action {
  readonly type = AuthActions.LOGOUT_FAILURE;
  constructor(public payload: { error: string }) {}
}

export class RefreshTokenRequestAction implements Action {
  readonly type = AuthActions.REFRESH_TOKEN_REQUEST;
  constructor(public payload: RefreshTokenRequest) {}
}

export class RefreshTokenSuccessAction implements Action {
  readonly type = AuthActions.REFRESH_TOKEN_SUCCESS;
  constructor(public payload: { token: string }) {}
}

export class RefreshTokenFailureAction implements Action {
  readonly type = AuthActions.REFRESH_TOKEN_FAILURE;
  constructor(public payload: { error: string }) {}
}

export class LoadUserRequestAction implements Action {
  readonly type = AuthActions.LOAD_USER_REQUEST;
}

export class LoadUserSuccessAction implements Action {
  readonly type = AuthActions.LOAD_USER_SUCCESS;
  constructor(public payload: { user: UserProfile }) {}
}

export class LoadUserFailureAction implements Action {
  readonly type = AuthActions.LOAD_USER_FAILURE;
  constructor(public payload: { error: string }) {}
}

export class SetLoadingAction implements Action {
  readonly type = AuthActions.SET_LOADING;
  constructor(public payload: { loading: boolean }) {}
}

export class SetErrorAction implements Action {
  readonly type = AuthActions.SET_ERROR;
  constructor(public payload: { error: string }) {}
}

export class ClearErrorAction implements Action {
  readonly type = AuthActions.CLEAR_ERROR;
}

export class UpdateUserAction implements Action {
  readonly type = AuthActions.UPDATE_USER;
  constructor(public payload: { user: UserProfile }) {}
}

export class SetAuthenticatedAction implements Action {
  readonly type = AuthActions.SET_AUTHENTICATED;
  constructor(public payload: { isAuthenticated: boolean }) {}
}

export type AuthAction =
  | LoginRequestAction
  | LoginSuccessAction
  | LoginFailureAction
  | LogoutRequestAction
  | LogoutSuccessAction
  | LogoutFailureAction
  | RefreshTokenRequestAction
  | RefreshTokenSuccessAction
  | RefreshTokenFailureAction
  | LoadUserRequestAction
  | LoadUserSuccessAction
  | LoadUserFailureAction
  | SetLoadingAction
  | SetErrorAction
  | ClearErrorAction
  | UpdateUserAction
  | SetAuthenticatedAction;

// State interface
export interface AuthFeatureState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
  lastAction: string | null;
}

// Initial state
export const initialAuthState: AuthFeatureState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  loading: false,
  error: null,
  lastAction: null,
};

// Reducer
export function authReducer(state: AuthFeatureState = initialAuthState, action: AuthAction): AuthFeatureState {
  switch (action.type) {
    case AuthActions.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastAction: AuthActions.LOGIN_REQUEST,
      };

    case AuthActions.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
        lastAction: AuthActions.LOGIN_SUCCESS,
      };

    case AuthActions.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload.error,
        lastAction: AuthActions.LOGIN_FAILURE,
      };

    case AuthActions.LOGOUT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastAction: AuthActions.LOGOUT_REQUEST,
      };

    case AuthActions.LOGOUT_SUCCESS:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        expiresAt: null,
        loading: false,
        error: null,
        lastAction: AuthActions.LOGOUT_SUCCESS,
      };

    case AuthActions.LOGOUT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        lastAction: AuthActions.LOGOUT_FAILURE,
      };

    case AuthActions.REFRESH_TOKEN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastAction: AuthActions.REFRESH_TOKEN_REQUEST,
      };

    case AuthActions.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        loading: false,
        error: null,
        lastAction: AuthActions.REFRESH_TOKEN_SUCCESS,
      };

    case AuthActions.REFRESH_TOKEN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        lastAction: AuthActions.REFRESH_TOKEN_FAILURE,
      };

    case AuthActions.LOAD_USER_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastAction: AuthActions.LOAD_USER_REQUEST,
      };

    case AuthActions.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        loading: false,
        error: null,
        lastAction: AuthActions.LOAD_USER_SUCCESS,
      };

    case AuthActions.LOAD_USER_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        lastAction: AuthActions.LOAD_USER_FAILURE,
      };

    case AuthActions.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
      };

    case AuthActions.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        loading: false,
      };

    case AuthActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AuthActions.UPDATE_USER:
      return {
        ...state,
        user: action.payload.user,
      };

    case AuthActions.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
      };

    default:
      return state;
  }
}

// Selectors
export const selectAuthState = (state: { auth: AuthFeatureState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthFeatureState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthFeatureState }) => state.auth.user;
export const selectToken = (state: { auth: AuthFeatureState }) => state.auth.token;
export const selectLoading = (state: { auth: AuthFeatureState }) => state.auth.loading;
export const selectError = (state: { auth: AuthFeatureState }) => state.auth.error;
export const selectLastAction = (state: { auth: AuthFeatureState }) => state.auth.lastAction;

// Effects
@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Observable<AuthAction>,
    private store: Store<{ auth: AuthFeatureState }>,
  ) {}

  // Add effects here for side effects like API calls
  // This would typically be implemented with @ngrx/effects
}

// Facade service
@Injectable({
  providedIn: 'root',
})
export class AuthFacade {
  private store: Store<{ auth: AuthFeatureState }> = inject(Store);

  // Selectors
  isAuthenticated$: Observable<boolean> = this.store.select(selectIsAuthenticated);
  user$: Observable<UserProfile | null> = this.store.select(selectUser);
  token$: Observable<string | null> = this.store.select(selectToken);
  loading$: Observable<boolean> = this.store.select(selectLoading);
  error$: Observable<string | null> = this.store.select(selectError);
  lastAction$: Observable<string | null> = this.store.select(selectLastAction);

  // Actions
  login(request: LoginRequest): void {
    this.store.dispatch(new LoginRequestAction(request));
  }

  logout(request?: LogoutRequest): void {
    this.store.dispatch(new LogoutRequestAction(request));
  }

  refreshToken(request: RefreshTokenRequest): void {
    this.store.dispatch(new RefreshTokenRequestAction(request));
  }

  loadUser(): void {
    this.store.dispatch(new LoadUserRequestAction());
  }

  setLoading(loading: boolean): void {
    this.store.dispatch(new SetLoadingAction({ loading }));
  }

  setError(error: string): void {
    this.store.dispatch(new SetErrorAction({ error }));
  }

  clearError(): void {
    this.store.dispatch(new ClearErrorAction());
  }

  updateUser(user: UserProfile): void {
    this.store.dispatch(new UpdateUserAction({ user }));
  }

  setAuthenticated(isAuthenticated: boolean): void {
    this.store.dispatch(new SetAuthenticatedAction({ isAuthenticated }));
  }
}
