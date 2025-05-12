// frontend/src/typescript/company.ts

// Based on backend Company schema
export interface ICompany {
  id: number;
  name: string;
  description?: string | null;
  email_domain?: string | null; 
  workspace_id: number;
  created_at: string;
  updated_at: string;
  // Add fields fr relationships if returned by backend
  primary_contact_id?: number | null;
  account_manager_id?: number | null;
  logo_url?: string | null; // Add logo_url field
}

export interface CompanyCreate {
  name: string;
  email_domain?: string | null; 
  logo_url?: string | null; 
}

// Payload for updating a company
export interface CompanyUpdatePayload {
  name?: string;
  description?: string | null;
  email_domain?: string | null; // Correct field name for update
  primary_contact_id?: number | null;
  account_manager_id?: number | null;
  logo_url?: string | null; 
}
