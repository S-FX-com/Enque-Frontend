export interface UserPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  workspace_id: number;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null; // Add email_signature
  iat: number;
  exp: number;
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
