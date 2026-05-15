import { Outlet, NavLink, useNavigate } from 'react-router';
import { Home, User, Briefcase, Users, MessageSquare, Network, LogOut } from 'lucide-react';
import { useAuth } from '../lib/authContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Inicio', exact: true },
    { to: '/profile', icon: User, label: 'Mi Perfil' },
    { to: '/projects', icon: Briefcase, label: 'Proyectos' },
    { to: '/my-teams', icon: Users, label: 'Mis Equipos' },
    { to: '/feedback', icon: MessageSquare, label: 'Evaluaciones' },
  ];

  // Get initials for avatar
  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-green-500">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TeamMatch</h1>
                <p className="text-xs text-muted-foreground">Formación Inteligente de Equipos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                Sistema Activo
              </div>
              {/* User avatar + name */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <span className="text-sm font-medium hidden sm:block">{user?.name.split(' ')[0]}</span>
              </div>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[73px] z-40 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
