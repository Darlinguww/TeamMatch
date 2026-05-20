import { useEffect, useState, type ComponentType } from 'react';
import { useTheme } from 'next-themes';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Bell,
  Shield,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  Mail,
  Calendar,
  Users,
  Eye,
  Gauge,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from './ui/utils';
import { useSettings } from '../lib/settingsContext';
import { toast } from 'sonner';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun, description: 'Fondo claro, ideal de día' },
  { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Menos brillo, ideal de noche' },
  { value: 'system', label: 'Sistema', icon: Monitor, description: 'Sigue la preferencia del SO' },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]['value'];

function SettingRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = (theme ?? 'system') as ThemeValue;

  const handleReset = () => {
    resetSettings();
    setTheme('system');
    toast.success('Ajustes restaurados', {
      description: 'Se aplicaron los valores predeterminados.',
    });
  };

  const handleClearCache = () => {
    const keysToKeep = ['teammatch_user', 'teammatch_registered_users', 'teammatch_settings', 'teammatch-theme'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToKeep.some((k) => key === k || key.startsWith('teammatch_avatar_'))) {
        localStorage.removeItem(key);
      }
    });
    toast.success('Caché local limpiada', {
      description: 'Tu sesión y ajustes se mantuvieron.',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Ajustes
        </h2>
        <p className="text-muted-foreground mt-1">
          Personaliza la apariencia, notificaciones y tu experiencia en TeamMatch
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Elige cómo se ve la interfaz. El tema oscuro reduce la fatiga visual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = mounted && activeTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!mounted}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                    'hover:border-primary/50 hover:bg-accent/50',
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card'
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  {selected && (
                    <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                      Activo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {mounted && (
            <p className="text-xs text-muted-foreground">
              Tema aplicado:{' '}
              <span className="font-medium text-foreground">
                {activeTheme === 'system'
                  ? `Sistema (${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`
                  : activeTheme === 'dark'
                    ? 'Oscuro'
                    : 'Claro'}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificaciones
          </CardTitle>
          <CardDescription>
            Controla qué alertas quieres recibir por correo (simulado en este prototipo)
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            id="notif-matches"
            icon={Sparkles}
            label="Proyectos recomendados"
            description="Avisos cuando hay proyectos con alto match para tu perfil"
            checked={settings.notifications.projectMatches}
            onCheckedChange={(v) =>
              updateSettings({ notifications: { projectMatches: v } })
            }
          />
          <SettingRow
            id="notif-tasks"
            icon={Calendar}
            label="Recordatorios de tareas"
            description="Recordatorios de fechas límite en tus proyectos activos"
            checked={settings.notifications.taskReminders}
            onCheckedChange={(v) =>
              updateSettings({ notifications: { taskReminders: v } })
            }
          />
          <SettingRow
            id="notif-team"
            icon={Users}
            label="Actualizaciones de equipo"
            description="Cambios en tu equipo, invitaciones y propuestas de IA"
            checked={settings.notifications.teamUpdates}
            onCheckedChange={(v) =>
              updateSettings({ notifications: { teamUpdates: v } })
            }
          />
          <SettingRow
            id="notif-digest"
            icon={Mail}
            label="Resumen semanal"
            description="Un correo con tu progreso y oportunidades cada lunes"
            checked={settings.notifications.weeklyDigest}
            onCheckedChange={(v) =>
              updateSettings({ notifications: { weeklyDigest: v } })
            }
          />
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacidad
          </CardTitle>
          <CardDescription>
            Define qué información compartes con otros usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            id="privacy-match"
            icon={Eye}
            label="Visible en matchmaking"
            description="Otros líderes pueden encontrarte en sugerencias de equipo"
            checked={settings.privacy.visibleInMatchmaking}
            onCheckedChange={(v) =>
              updateSettings({ privacy: { visibleInMatchmaking: v } })
            }
          />
          <SettingRow
            id="privacy-email"
            icon={Mail}
            label="Mostrar email al equipo"
            description="Los miembros de tus proyectos verán tu correo de contacto"
            checked={settings.privacy.showEmailToTeam}
            onCheckedChange={(v) =>
              updateSettings({ privacy: { showEmailToTeam: v } })
            }
          />
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Experiencia
          </CardTitle>
          <CardDescription>
            Ajustes de interfaz y accesibilidad
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            id="exp-compact"
            icon={Gauge}
            label="Interfaz compacta"
            description="Reduce espaciados en navegación y listas"
            checked={settings.experience.compactLayout}
            onCheckedChange={(v) =>
              updateSettings({ experience: { compactLayout: v } })
            }
          />
          <SettingRow
            id="exp-motion"
            label="Reducir animaciones"
            description="Menos transiciones y efectos visuales"
            checked={settings.experience.reduceMotion}
            onCheckedChange={(v) =>
              updateSettings({ experience: { reduceMotion: v } })
            }
          />
          <SettingRow
            id="exp-match"
            icon={Sparkles}
            label="Mostrar % de match en proyectos"
            description="Badge de compatibilidad en tarjetas de proyecto"
            checked={settings.experience.showMatchScores}
            onCheckedChange={(v) =>
              updateSettings({ experience: { showMatchScores: v } })
            }
          />
        </CardContent>
      </Card>

      {/* Data & reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos y mantenimiento</CardTitle>
          <CardDescription>
            Restablece preferencias o limpia datos temporales del navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Restaurar ajustes
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleClearCache}>
            <Trash2 className="h-4 w-4" />
            Limpiar caché local
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground pb-4">
        Los cambios se guardan automáticamente en este dispositivo.
      </p>
    </div>
  );
}
