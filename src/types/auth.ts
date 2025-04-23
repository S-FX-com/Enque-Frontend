export interface UserPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  workspace_id: number;
  exp?: number;
  iat?: number;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  subdomain?: string;
}

export interface LoginData {
  email: string;
  password: string;
} 