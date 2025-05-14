import { IUser, IAgent } from './user'; // Import IAgent

// Definición de la interfaz para un adjunto
export interface IAttachment {
  id: number; // O string, dependiendo de la implementación del backend (parece ser int por el schema)
  file_name: string;
  content_type: string;
  file_size: number;
  download_url: string; // URL relativa para descargar el archivo
  created_at: string; // O Date, si se convierte en el frontend
}

export interface IComment {
  id: number;
  content: string; // Could be plain text or HTML
  created_at: string;
  updated_at: string; // Add updated_at based on backend schema
  is_private?: boolean; // Make optional as it might not come from backend
  user?: IUser | null; // Sender can be a User (optional)
  agent?: IAgent | null; // Sender can be an Agent (optional)
  ticket_id: number;
  workspace_id: number; // Add workspace_id based on backend schema
  attachments?: IAttachment[]; // <--- Nuevo campo para los adjuntos
}

// Optional: Interface for creating comments if needed later
export interface ICreateComment {
  ticket_id: number;
  content: string;
  is_private?: boolean;
  // user_id will likely be inferred from the authenticated session backend-side
}
