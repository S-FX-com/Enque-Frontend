"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserSession } from "@/lib/auth";

export default function WorkspaceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/main");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Error al verificar autenticación:", error);
        router.push("/main");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <h1 className="text-xl mb-4">Cargando workspace...</h1>
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="container mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">
              <span className="text-slate-900">En</span>
              <span className="text-blue-600">que</span>
            </h1>
            <span className="text-sm text-slate-500">Dashboard</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-sm font-medium">
                Hola, {user.name}
              </div>
            )}
            <button
              className="text-sm text-red-600 hover:underline"
              onClick={() => {
                localStorage.removeItem("auth_token");
                router.push("/main");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-6">
        <h2 className="text-2xl font-bold mb-6">Bienvenido a tu workspace</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Tickets recientes</h3>
            <p className="text-slate-500">Aún no hay tickets disponibles.</p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
            <p className="text-slate-500">No hay datos disponibles.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
