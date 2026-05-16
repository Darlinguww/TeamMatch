import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Network, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Check, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-all duration-300 ${met ? 'text-green-600' : 'text-muted-foreground'}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 ${
          met ? 'bg-green-100 scale-110' : 'bg-muted'
        }`}
      >
        {met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      {text}
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!allRulesMet) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await register({ name, email, password });
    setLoading(false);
    if (result.success) {
      navigate('/onboarding');
    } else {
      setError(result.error ?? 'Error al crear la cuenta.');
    }
  };

  const STEPS = [
    { num: '1', label: 'Crea tu cuenta', active: true },
    { num: '2', label: 'Completa tu perfil de habilidades', active: false },
    { num: '3', label: 'El motor te hace match con proyectos', active: false },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 60%, #06b6d4 100%)' }}
      >
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-72 h-72 rounded-full bg-white/10"
            style={{ top: '-4rem', left: '-4rem', animation: 'float 9s ease-in-out infinite' }}
          />
          <div
            className="absolute w-48 h-48 rounded-full bg-white/10"
            style={{ bottom: '8rem', right: '-2rem', animation: 'float 7s ease-in-out infinite reverse' }}
          />
          <div
            className="absolute w-28 h-28 rounded-full bg-white/10"
            style={{ top: '55%', left: '60%', animation: 'float 5s ease-in-out infinite 1s' }}
          />
          {/* Grid dots */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
              style={{
                top: `${8 + (i % 4) * 25}%`,
                left: `${5 + Math.floor(i / 4) * 30}%`,
                animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`,
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
              Únete y encuentra tu equipo ideal
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Registra tus habilidades y deja que la IA encuentre los proyectos y compañeros perfectos para ti.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="flex items-center gap-4"
                style={{ animation: `slideInLeft 0.5s ease-out ${0.2 + i * 0.15}s both` }}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    step.active
                      ? 'bg-white text-violet-600 shadow-lg shadow-white/20'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {step.num}
                </div>
                <span className={`text-sm ${step.active ? 'text-white font-semibold' : 'text-white/70'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          Universidad del Norte · Diseño de Software I · 2026
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div
          className="w-full max-w-md py-8 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TeamMatch</h1>
              <p className="text-xs text-muted-foreground">Formación Inteligente de Equipos</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Crear cuenta</h2>
            <p className="text-muted-foreground">Completa tus datos para comenzar</p>
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

            {/* Name */}
            <div
              className="space-y-2"
              style={{ animation: 'slideInUp 0.4s ease-out 0.1s both' }}
            >
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ej: María García"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11 transition-shadow duration-200 focus:shadow-md focus:shadow-violet-500/10"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div
              className="space-y-2"
              style={{ animation: 'slideInUp 0.4s ease-out 0.2s both' }}
            >
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 transition-shadow duration-200 focus:shadow-md focus:shadow-violet-500/10"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div
              className="space-y-2"
              style={{ animation: 'slideInUp 0.4s ease-out 0.3s both' }}
            >
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11 pr-10 transition-shadow duration-200 focus:shadow-md focus:shadow-violet-500/10"
                  autoComplete="new-password"
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

              {/* Password rules — animated appearance */}
              <div
                className="overflow-hidden transition-all duration-500"
                style={{ maxHeight: password.length > 0 ? '120px' : '0px', opacity: password.length > 0 ? 1 : 0 }}
              >
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 mt-2">
                  <PasswordRule met={rules.length} text="Mínimo 8 caracteres" />
                  <PasswordRule met={rules.upper} text="Al menos una letra mayúscula" />
                  <PasswordRule met={rules.number} text="Al menos un número" />
                </div>
              </div>
            </div>

            {/* Confirm password */}
            <div
              className="space-y-2"
              style={{ animation: 'slideInUp 0.4s ease-out 0.4s both' }}
            >
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`h-11 pr-10 transition-all duration-300 ${
                    confirmPassword.length > 0
                      ? rules.match
                        ? 'border-green-500 focus-visible:ring-green-500 shadow-sm shadow-green-500/20'
                        : 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: confirmPassword.length > 0 ? '30px' : '0px', opacity: confirmPassword.length > 0 ? 1 : 0 }}
              >
                <p className={`text-xs flex items-center gap-1 ${rules.match ? 'text-green-600' : 'text-destructive'}`}>
                  {rules.match
                    ? <><CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden</>
                    : <><AlertCircle className="h-3 w-3" /> Las contraseñas no coinciden</>}
                </p>
              </div>
            </div>

            <div style={{ animation: 'slideInUp 0.4s ease-out 0.5s both' }}>
              <Button
                type="submit"
                className="w-full h-11 gap-2 text-white font-medium relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
                disabled={loading}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #0e7490)' }}
                />
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Crear cuenta
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(4deg); }
          66% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.4); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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