// Tipo genérico para respuestas de servicio
export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Tipo para la paginación
export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

// Interfaz base para filtros
export interface BaseFilters {
  skip?: number; // Use skip instead of page to match backend API
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Interfaz para la navegación
export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}
