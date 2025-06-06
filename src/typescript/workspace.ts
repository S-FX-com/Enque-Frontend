import { BaseFilters } from './index';

// Interfaz para workspace
export interface IWorkspace {
  id: number;
  subdomain: string;
  created_at: string;
  updated_at: string;
}

// Interfaz para crear workspace (solo subdomain)
export interface ICreateWorkspace {
  subdomain: string;
}

// Interfaz para setup inicial
export interface IWorkspaceSetup {
  subdomain: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

// Interfaz para la respuesta del setup
export interface IWorkspaceSetupResponse {
  workspace: IWorkspace;
  admin: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    workspace_id: number;
    created_at: string | null;
    updated_at: string | null;
  };
  access_token: string;
  token_type: string;
}

// Interfaz para actualizar workspace
export interface IUpdateWorkspace {
  name?: string;
  subdomain?: string;
  logo_url?: string;
  theme?: string;
}

// Interfaz para filtrar workspaces
export interface IGetWorkspace extends BaseFilters {
  id?: number;
  subdomain?: string;
}
