import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Network, Eye, EyeOff, LogIn, AlertCircle, Sparkles, Users, Zap } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const FEATURES = [
  { icon: Sparkles, text: 'Motor de emparejamiento con IA' },
  { icon: Users, text: 'Score de afinidad por proyecto' },
  { icon: Zap, text: 'Retroalimentación entre equipos' },
];

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0891b2 50%, #06b6d4 100%)' }}
      >
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-80 h-80 rounded-full bg-white/10"
            style={{ top: '-5rem', right: '-5rem', animation: 'float 8s ease-in-out infinite' }}
          />
          <div
            className="absolute w-56 h-56 rounded-full bg-white/10"
            style={{ bottom: '5rem', left: '-3rem', animation: 'float 10s ease-in-out infinite reverse' }}
          />
          <div
            className="absolute w-36 h-36 rounded-full bg-white/10"
            style={{ top: '40%', left: '55%', animation: 'float 6s ease-in-out infinite 2s' }}
          />
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white/30"
              style={{
                top: `${15 + i * 14}%`,
                left: `${10 + i * 12}%`,
                animation: `float ${4 + i}s ease-in-out infinite ${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"
            style={{ animation: 'pulse-slow 3s ease-in-out infinite' }}
          >
            <Network className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">TeamMatch</h1>
            <p className="text-white/70 text-sm">Formación Inteligente de Equipos</p>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Forma equipos perfectos con inteligencia artificial
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Conecta tus habilidades con proyectos que necesitan exactamente lo que tú ofrecés.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {FEATURES.map((feat, i) => (
              <div
                key={feat.text}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3"
                style={{ animation: `slideInLeft 0.5s ease-out ${0.2 + i * 0.15}s both` }}
              >
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <feat.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{feat.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          Universidad del Norte · Diseño de Software I · 2026
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="w-full max-w-md transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500">
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
              <div
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                style={{ animation: 'shake 0.4s ease-out' }}
              >
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
                className="h-11 transition-shadow duration-200 focus:shadow-md focus:shadow-primary/10"
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
                  className="h-11 pr-10 transition-shadow duration-200 focus:shadow-md focus:shadow-primary/10"
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
              className="w-full h-11 gap-2 text-white font-medium relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #16a34a, #0891b2)' }}
              disabled={loading}
            >
              {/* Shimmer effect */}
              <span
                className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
              />
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
            <Link to="/register" className="text-primary font-medium hover:underline transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(3deg); }
          66% { transform: translateY(-8px) rotate(-2deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}