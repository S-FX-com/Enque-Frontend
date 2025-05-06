// Define the interface for the Category object based on backend schema
export interface ICategory {
  id: number;
  name: string;
  created_at: string; // Assuming ISO format string
  updated_at: string; // Assuming ISO format string
}
