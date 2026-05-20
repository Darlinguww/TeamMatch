import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bell, X, Check, AlertCircle, Loader, UserPlus, ThumbsDown } from 'lucide-react';
import type { UserNotification } from '../lib/projectApi';
import { notificationsApi } from '../lib/projectApi';

interface NotificationCenterProps {
  open?: boolean;
  onClose?: () => void;
}

const ACTIONABLE_TYPES = new Set(['PROJECT_JOIN_REQUEST', 'ROLE_APPLICATION_REQUEST']);

export function NotificationCenter({ open = true, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open]);

  useEffect(() => {
    const onNotificationsChanged = () => {
      if (open) {
        void loadNotifications();
      }
    };
    window.addEventListener('teammatch:notifications-changed', onNotificationsChanged);
    return () => window.removeEventListener('teammatch:notifications-changed', onNotificationsChanged);
  }, [open]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationsApi.list();
      setNotifications(response.notifications || []);
    } catch (err) {
      setError('Error al cargar las notificaciones');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error marking notification as read:', err);
    }
  };

  const handleRespond = async (notificationId: string, decision: 'approved' | 'rejected') => {
    setRespondingId(notificationId);
    try {
      setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
      await notificationsApi.respond(notificationId, decision);
      await loadNotifications();
      window.dispatchEvent(new CustomEvent('teammatch:membership-changed'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error responding to notification:', err);
      await loadNotifications();
      alert('No se pudo procesar la solicitud. ¿Sigues siendo el líder del proyecto?');
    } finally {
      setRespondingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groupedNotifications = notifications.reduce(
    (acc, notif) => {
      const key = notif.read ? 'read' : 'unread';
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif);
      return acc;
    },
    {} as Record<string, UserNotification[]>
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_IN_REVIEW':
      case 'task-review':
        return <AlertCircle className="w-4 h-4" />;
      case 'PROJECT_JOIN_REQUEST':
      case 'ROLE_APPLICATION_REQUEST':
        return <UserPlus className="w-4 h-4" />;
      case 'PROJECT_JOIN_APPROVED':
      case 'ROLE_APPLICATION_APPROVED':
      case 'TASK_APPROVED':
      case 'task-approved':
      case 'task-completed':
        return <Check className="w-4 h-4" />;
      case 'PROJECT_JOIN_REJECTED':
      case 'ROLE_APPLICATION_REJECTED':
      case 'TASK_RETURNED':
      case 'task-rejected':
        return <ThumbsDown className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50';
    switch (type) {
      case 'PROJECT_JOIN_REQUEST':
      case 'ROLE_APPLICATION_REQUEST':
        return 'bg-amber-50';
      case 'TASK_IN_REVIEW':
      case 'task-review':
        return 'bg-blue-50';
      case 'PROJECT_JOIN_APPROVED':
      case 'ROLE_APPLICATION_APPROVED':
      case 'TASK_APPROVED':
      case 'task-approved':
      case 'task-completed':
        return 'bg-green-50';
      case 'PROJECT_JOIN_REJECTED':
      case 'ROLE_APPLICATION_REJECTED':
      case 'TASK_RETURNED':
      case 'task-rejected':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getNotificationBorder = (type: string, read: boolean) => {
    if (read) return 'border-gray-200';
    switch (type) {
      case 'PROJECT_JOIN_REQUEST':
      case 'ROLE_APPLICATION_REQUEST':
        return 'border-amber-200 border-l-4 border-l-amber-500';
      case 'TASK_IN_REVIEW':
      case 'task-review':
        return 'border-blue-200 border-l-4 border-l-blue-500';
      case 'PROJECT_JOIN_APPROVED':
      case 'ROLE_APPLICATION_APPROVED':
      case 'TASK_APPROVED':
      case 'task-approved':
      case 'task-completed':
        return 'border-green-200 border-l-4 border-l-green-500';
      case 'PROJECT_JOIN_REJECTED':
      case 'ROLE_APPLICATION_REJECTED':
      case 'TASK_RETURNED':
      case 'task-rejected':
        return 'border-red-200 border-l-4 border-l-red-500';
      default:
        return 'border-gray-200';
    }
  };

  const renderNotificationCard = (notif: UserNotification) => {
    const isActionable = notif.actionable && ACTIONABLE_TYPES.has(notif.type);
    const isResponding = respondingId === notif.notificationId;

    return (
      <div
        key={notif.notificationId}
        className={`mx-2 p-3 rounded-lg border ${getNotificationColor(notif.type, notif.read)} ${getNotificationBorder(notif.type, notif.read)}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 text-blue-600">
            {getNotificationIcon(notif.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{notif.message}</p>
            {notif.applicantDisplayName && isActionable && (
              <p className="text-xs text-gray-600 mt-1">
                Candidato: {notif.applicantDisplayName}
                {notif.roleName ? ` · Rol: ${notif.roleName}` : ''}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
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
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Ver proyecto
              </Link>
            )}
            {isActionable && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => void handleRespond(notif.notificationId, 'approved')}
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  Aprobar
                </button>
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => void handleRespond(notif.notificationId, 'rejected')}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Rechazar
                </button>
              </div>
            )}
          </div>
          {!isActionable && !notif.read && (
            <button
              type="button"
              onClick={() => void handleMarkAsRead(notif.notificationId)}
              className="flex-shrink-0 p-1 hover:bg-white rounded transition"
              title="Marcar como leída"
            >
              <Check className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">{unreadCount} sin leer</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mb-2 opacity-30" />
            <p>No hay notificaciones</p>
          </div>
        )}

        {groupedNotifications.unread && groupedNotifications.unread.length > 0 && (
          <div className="px-2 py-3">
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Nuevas
            </h3>
            <div className="space-y-2 mt-2">
              {groupedNotifications.unread.map(renderNotificationCard)}
            </div>
          </div>
        )}

        {groupedNotifications.read && groupedNotifications.read.length > 0 && (
          <div className="px-2 py-3 border-t border-gray-100">
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Anteriores
            </h3>
            <div className="space-y-2 mt-2">
              {groupedNotifications.read.map(renderNotificationCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
