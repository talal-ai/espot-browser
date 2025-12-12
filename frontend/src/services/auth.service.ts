import axios from 'axios';
import { API_CONFIG } from '../config/api.config';
import { supabase, getAuthRedirectUrl } from '../lib/supabase';

const API_URL = API_CONFIG.baseURL;

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

class AuthService {
  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        { emailOrUsername, password },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials. Please check your email/username and password.');
      }
      throw new Error(error.response?.data?.detail || 'Login failed. Please try again.');
    }
  }

  async signup(email: string, password: string, username: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/auth/signup`,
        { email, password, username },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('User already exists or invalid data provided.');
      }
      throw new Error(error.response?.data?.detail || 'Signup failed. Please try again.');
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to get current user');
    }
  }

  /**
   * Initiate Google OAuth via Supabase.
   * This triggers a full-page redirect to Google and then back to `/auth/callback`.
   * Do NOT expect a session here; finalize in the callback route.
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) {
      throw new Error(error.message || 'Google sign-in failed.');
    }
    // On success, the browser will navigate to Google; no further action here.
  }

  async logout(): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { headers: this.getHeaders() }
      );
      // Also clear Supabase session if present
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_URL}/auth/verify`, {
        headers: this.getHeaders(),
      });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();
