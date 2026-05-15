import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Network, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error ?? 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary via-cyan-500 to-green-500 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-32 right-10 w-48 h-48 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Network className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">TeamMatch</h1>
            <p className="text-white/70 text-sm">Formación Inteligente de Equipos</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Forma equipos perfectos con inteligencia artificial
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Conecta tus habilidades con proyectos que necesitan exactamente lo que tú ofrecés.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              'Motor de emparejamiento con IA',
              'Score de afinidad por proyecto',
              'Retroalimentación entre equipos',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white" />
                <span className="text-white/90 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          Universidad del Norte · Diseño de Software I · 2026
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-green-500">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TeamMatch</h1>
              <p className="text-xs text-muted-foreground">Formación Inteligente de Equipos</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Demo hint */}
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-primary font-medium mb-1">🔑 Cuenta de demo</p>
            <p className="text-xs text-muted-foreground">
              Email: <span className="font-mono font-medium">maria.garcia@example.com</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Contraseña: <span className="font-mono font-medium">Password1</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setError('La recuperación de contraseña se implementará en el backend.')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Iniciando sesión...
                </span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
