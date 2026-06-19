import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Bell,
  Check,
  AlertCircle,
  Loader2,
  UserPlus,
  ThumbsDown,
  CheckCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserNotification } from '../lib/projectApi';
import { notificationsApi } from '../lib/projectApi';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

const ACTIONABLE_TYPES = new Set(['PROJECT_JOIN_REQUEST', 'ROLE_APPLICATION_REQUEST']);

function getNotificationVariant(type: string): 'action' | 'review' | 'success' | 'error' | 'default' {
  switch (type) {
    case 'PROJECT_JOIN_REQUEST':
    case 'ROLE_APPLICATION_REQUEST':
      return 'action';
    case 'TASK_IN_REVIEW':
    case 'task-review':
      return 'review';
    case 'PROJECT_JOIN_APPROVED':
    case 'ROLE_APPLICATION_APPROVED':
    case 'TASK_APPROVED':
    case 'task-approved':
    case 'task-completed':
      return 'success';
    case 'PROJECT_JOIN_REJECTED':
    case 'ROLE_APPLICATION_REJECTED':
    case 'TASK_RETURNED':
    case 'task-rejected':
      return 'error';
    default:
      return 'default';
  }
}

const variantStyles: Record<
  ReturnType<typeof getNotificationVariant>,
  { card: string; icon: string; border: string }
> = {
  action: {
    card: 'bg-amber-50/80 dark:bg-amber-950/30',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500',
  },
  review: {
    card: 'bg-blue-50/80 dark:bg-blue-950/30',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800 border-l-4 border-l-blue-500',
  },
  success: {
    card: 'bg-green-50/80 dark:bg-green-950/30',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800 border-l-4 border-l-green-500',
  },
  error: {
    card: 'bg-red-50/80 dark:bg-red-950/30',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800 border-l-4 border-l-red-500',
  },
  default: {
    card: 'bg-card',
    icon: 'text-muted-foreground',
    border: 'border-border',
  },
};

function NotificationIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4';
  switch (type) {
    case 'TASK_IN_REVIEW':
    case 'task-review':
      return <AlertCircle className={cls} />;
    case 'PROJECT_JOIN_REQUEST':
    case 'ROLE_APPLICATION_REQUEST':
      return <UserPlus className={cls} />;
    case 'PROJECT_JOIN_APPROVED':
    case 'ROLE_APPLICATION_APPROVED':
    case 'TASK_APPROVED':
    case 'task-approved':
    case 'task-completed':
      return <Check className={cls} />;
    case 'PROJECT_JOIN_REJECTED':
    case 'ROLE_APPLICATION_REJECTED':
    case 'TASK_RETURNED':
    case 'task-rejected':
      return <ThumbsDown className={cls} />;
    default:
      return <Bell className={cls} />;
  }
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.list();
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
    const onChanged = () => void loadNotifications();
    window.addEventListener('teammatch:notifications-changed', onChanged);
    return () => window.removeEventListener('teammatch:notifications-changed', onChanged);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n))
      );
      window.dispatchEvent(new CustomEvent('teammatch:notifications-changed'));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('No se pudo marcar la notificación como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => notificationsApi.markAsRead(n.notificationId)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new CustomEvent('teammatch:notifications-changed'));
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch {
      toast.error('No se pudieron marcar todas las notificaciones');
      await loadNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleRespond = async (notificationId: string, decision: 'approved' | 'rejected') => {
    setRespondingId(notificationId);
    try {
      await notificationsApi.respond(notificationId, decision);
      setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
      window.dispatchEvent(new CustomEvent('teammatch:membership-changed'));
      window.dispatchEvent(new CustomEvent('teammatch:notifications-changed'));
      toast.success(decision === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      await loadNotifications();
    } catch (err) {
      console.error('Error responding to notification:', err);
      await loadNotifications();
      toast.error('No se pudo procesar la solicitud. ¿Sigues siendo el líder del proyecto?');
    } finally {
      setRespondingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const renderNotificationCard = (notif: UserNotification) => {
    const isActionable = notif.actionable && ACTIONABLE_TYPES.has(notif.type);
    const isResponding = respondingId === notif.notificationId;
    const variant = getNotificationVariant(notif.type);
    const styles = notif.read
      ? { card: 'bg-muted/30', icon: 'text-muted-foreground', border: 'border-border opacity-80' }
      : variantStyles[variant];

    return (
      <Card
        key={notif.notificationId}
        className={cn('border', styles.border, styles.card)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5 shrink-0', styles.icon)}>
              <NotificationIcon type={notif.type} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">{notif.message}</p>
              {notif.applicantDisplayName && isActionable && (
                <p className="text-xs text-muted-foreground">
                  Candidato: {notif.applicantDisplayName}
                  {notif.roleName ? ` · Rol: ${notif.roleName}` : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {notif.createdAt
                  ? new Date(notif.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Sin fecha'}
              </p>
              {notif.projectId && (
                <Link
                  to={`/projects/${notif.projectId}`}
                  className="text-xs text-primary hover:underline inline-block"
                >
                  Ver proyecto
                </Link>
              )}
              {isActionable && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isResponding}
                    onClick={() => void handleRespond(notif.notificationId, 'approved')}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isResponding}
                    onClick={() => void handleRespond(notif.notificationId, 'rejected')}
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
            {!isActionable && !notif.read && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                title="Marcar como leída"
                onClick={() => void handleMarkAsRead(notif.notificationId)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alertas</h2>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? `${unreadCount} notificación${unreadCount === 1 ? '' : 'es'} sin leer`
              : 'Estás al día con tus notificaciones'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadNotifications()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
            Actualizar
          </Button>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleMarkAllAsRead()}
              disabled={markingAll}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Marcar todas leídas
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No hay alertas por el momento</p>
            <p className="text-sm mt-1">Cuando recibas solicitudes de equipo o actualizaciones de tareas, aparecerán aquí.</p>
          </CardContent>
        </Card>
      )}

      {!loading && notifications.length > 0 && unread.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Nuevas</h3>
            <Badge variant="secondary">{unread.length}</Badge>
          </div>
          <div className="space-y-3">
            {unread.map(renderNotificationCard)}
          </div>
        </section>
      )}

      {!loading && notifications.length > 0 && read.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Anteriores</h3>
          <div className="space-y-3">
            {read.map(renderNotificationCard)}
          </div>
        </section>
      )}
    </div>
  );
}
