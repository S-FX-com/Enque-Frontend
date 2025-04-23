import { useState, useEffect } from 'react';

interface User {
  id?: string;
  name?: string;
  email?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Función para obtener el usuario actual
    const getCurrentUser = async () => {
      try {
        // Simulamos obtener el usuario del localStorage (en producción esto vendría de una API)
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Si no hay usuario en localStorage, podríamos intentar obtenerlo de una API
          // En este caso, simulamos un usuario para demostración
          const mockUser = {
            id: '123',
            name: 'Usuario Demo',
            email: 'demo@example.com'
          };
          
          // Guardamos el usuario simulado en localStorage
          localStorage.setItem('user', JSON.stringify(mockUser));
          setUser(mockUser);
        }
      } catch (error) {
        console.error('Error al obtener el usuario:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
} 