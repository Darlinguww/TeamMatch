import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Network, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Check, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
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

  // Password rules
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
      navigate('/');
    } else {
      setError(result.error ?? 'Error al crear la cuenta.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary via-cyan-500 to-green-500 relative overflow-hidden">
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
              Únete y encuentra tu equipo ideal
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Registra tus habilidades y deja que la IA encuentre los proyectos y compañeros perfectos para ti.
            </p>
          </div>

          {/* Step indicators */}
          <div className="space-y-4">
            {[
              { num: '1', label: 'Crea tu cuenta' },
              { num: '2', label: 'Completa tu perfil de habilidades' },
              { num: '3', label: 'El motor te hace match con proyectos' },
            ].map(step => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold">
                  {step.num}
                </div>
                <span className="text-white/90 text-sm">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          Universidad del Norte · Diseño de Software I · 2026
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
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
            <h2 className="text-3xl font-bold mb-2">Crear cuenta</h2>
            <p className="text-muted-foreground">Completa tus datos para comenzar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ej: María García"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11"
                autoComplete="name"
              />
            </div>

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
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11 pr-10"
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

              {/* Password rules */}
              {password.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 mt-2">
                  <PasswordRule met={rules.length} text="Mínimo 8 caracteres" />
                  <PasswordRule met={rules.upper} text="Al menos una letra mayúscula" />
                  <PasswordRule met={rules.number} text="Al menos un número" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`h-11 pr-10 ${confirmPassword.length > 0 ? (rules.match ? 'border-green-500 focus-visible:ring-green-500' : 'border-destructive focus-visible:ring-destructive') : ''}`}
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
              {confirmPassword.length > 0 && (
                <p className={`text-xs flex items-center gap-1 ${rules.match ? 'text-green-600' : 'text-destructive'}`}>
                  {rules.match ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {rules.match ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creando cuenta...
                </span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
