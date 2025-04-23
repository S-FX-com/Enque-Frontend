import { Cookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';
import { UserPayload } from '@/types/auth';

const cookies = new Cookies();

export const setCookie = (name: string, value: string, options?: Record<string, unknown>) => {
  cookies.set(name, value, {
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    ...options,
  });
};

export const getCookie = (name: string) => {
  return cookies.get(name);
};

export const removeCookie = (name: string) => {
  cookies.remove(name, { path: '/' });
};

export const getTokenPayload = (): UserPayload | null => {
  const token = getCookie('token');
  if (!token) return null;
  
  try {
    return jwtDecode<UserPayload>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isTokenExpired = (): boolean => {
  const payload = getTokenPayload();
  if (!payload || !payload.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}; 