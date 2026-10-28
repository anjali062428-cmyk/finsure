import { apiClient, setAuthTokens, getRefreshToken } from './client';
import {
  User,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyPhoneRequest,
  GenericActionResponse,
  LoginPasswordRequest,
  RequestOTPRequest,
  LoginOTPRequest,
  AuthTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  StepUpRequest,
  StepUpChallengeResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
} from '../types/auth';

export const authApi = {
  register: async (req: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  verifyEmail: async (req: VerifyEmailRequest): Promise<GenericActionResponse> => {
    return apiClient<GenericActionResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  verifyPhone: async (req: VerifyPhoneRequest): Promise<GenericActionResponse> => {
    return apiClient<GenericActionResponse>('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  login: async (req: LoginPasswordRequest): Promise<AuthTokenResponse> => {
    const res = await apiClient<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    if (res.access_token) {
      setAuthTokens(res.access_token, res.refresh_token);
    }
    return res;
  },

  requestOtp: async (req: RequestOTPRequest): Promise<GenericActionResponse> => {
    return apiClient<GenericActionResponse>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  verifyOtp: async (req: LoginOTPRequest): Promise<AuthTokenResponse> => {
    const res = await apiClient<AuthTokenResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    if (res.access_token) {
      setAuthTokens(res.access_token, res.refresh_token);
    }
    return res;
  },

  passwordResetRequest: async (req: PasswordResetRequest): Promise<GenericActionResponse> => {
    return apiClient<GenericActionResponse>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  passwordResetConfirm: async (req: PasswordResetConfirmRequest): Promise<GenericActionResponse> => {
    return apiClient<GenericActionResponse>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  stepUpRequest: async (req: StepUpRequest): Promise<StepUpChallengeResponse> => {
    return apiClient<StepUpChallengeResponse>('/auth/step-up/request', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  stepUpVerify: async (req: StepUpVerifyRequest): Promise<StepUpVerifyResponse> => {
    return apiClient<StepUpVerifyResponse>('/auth/step-up/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getMe: async (): Promise<User> => {
    return apiClient<User>('/auth/me');
  },

  logout: async (): Promise<GenericActionResponse> => {
    const currentRefresh = getRefreshToken();
    try {
      if (currentRefresh) {
        return await apiClient<GenericActionResponse>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: currentRefresh }),
        });
      }
      return { success: true, message: 'Logged out locally.' };
    } finally {
      setAuthTokens(null, null);
    }
  },
};
