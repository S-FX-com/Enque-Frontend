import { BaseFilters } from './index';

// Interfaz para workspace
export interface IWorkspace {
  id: number;
  name: string;
  subdomain: string;
  logo_url?: string;
  theme?: string;
  created_at: string;
  updated_at: string;
}

// Interfaz para crear workspace
export interface ICreateWorkspace {
  name: string;
  subdomain: string;
  logo_url?: string;
  theme?: string;
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