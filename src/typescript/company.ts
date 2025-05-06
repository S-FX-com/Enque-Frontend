// frontend/src/typescript/company.ts

// Based on backend Company schema
export interface ICompany {
  id: number;
  name: string;
  description?: string | null;
  email_domain?: string | null; // Correct field name
  workspace_id: number;
  created_at: string;
  updated_at: string;
  // Add fields for relationships if returned by backend
  primary_contact_id?: number | null;
  account_manager_id?: number | null;
}

// Based on backend CompanyCreate schema
// Note: Backend schema uses email_domain, but create endpoint might accept domain for simplicity?
// Let's keep CompanyCreate with domain for now, assuming create endpoint handles it.
// If create fails, we'll need to adjust this and the createCompany service/modal.
export interface CompanyCreate {
  name: string;
  domain?: string | null; // Keep as domain for create for now
  // workspace_id is handled by the backend
}

// Payload for updating a company
export interface CompanyUpdatePayload {
  name?: string;
  description?: string | null;
  email_domain?: string | null; // Correct field name for update
  // Assuming backend accepts these IDs for update
  primary_contact_id?: number | null;
  account_manager_id?: number | null;
  // logo_url?: string | null; // Add if logo update is needed
}
