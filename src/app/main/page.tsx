'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth';
import { AppConfigs } from '@/configs';

export default function MainPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        email,
        password,
      });

      if (response.success) {
        router.push(AppConfigs.routes.dashboard);
      } else {
        setError(response.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="flex flex-col items-center max-w-md w-full space-y-10 py-10">
        <div className="flex flex-col items-center space-y-2">
          <Brand />
          <p className="text-slate-500 text-sm">Sistema de Help Desk</p>
        </div>

        <div className="w-full space-y-6 bg-slate-50 p-8 rounded-lg shadow-sm border border-slate-100">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Iniciar Sesión</h1>
            <p className="text-sm text-slate-500">Ingresa tus credenciales para acceder</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              ¿No tienes una cuenta?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
