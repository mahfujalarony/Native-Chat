import api from './api';

export interface UserData {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: UserData;
}

export const loginUser = async (credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || 'Login failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || 'Registration failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
};
