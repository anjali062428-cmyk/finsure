import { Role } from './common';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  email_verified: boolean;
  phone_verified: boolean;
  account_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: User;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role?: Role;
}

export interface RegisterResponse {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  account_status: string;
  message: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface VerifyPhoneRequest {
  phone: string;
  otp: string;
}

export interface GenericActionResponse {
  success: boolean;
  message: string;
}

export interface LoginPasswordRequest {
  identifier: string; // email or phone
  password: string;
  device_id?: string;
}

export interface RequestOTPRequest {
  identifier: string;
  channel?: 'phone' | 'email';
}

export interface LoginOTPRequest {
  identifier: string;
  otp: string;
  device_id?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  identifier: string;
  channel?: 'email' | 'phone';
}

export interface PasswordResetConfirmRequest {
  identifier: string;
  otp: string;
  new_password: string;
}

export interface StepUpRequest {
  transaction_id?: string;
  channel?: 'phone' | 'email';
}

export interface StepUpChallengeResponse {
  challenge_id: string;
  message: string;
}

export interface StepUpVerifyRequest {
  challenge_id: string;
  otp: string;
}

export interface StepUpVerifyResponse {
  success: boolean;
  message: string;
  step_up_token?: string;
}
