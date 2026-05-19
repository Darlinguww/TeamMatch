import { useState } from "react";
import { cn } from "./ui/utils";
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  FileText, 
  User,
  Zap,
  X
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNavigationClick = (pageId: string) => {
    if (!isExpanded) {
      setIsExpanded(true);
      // Delay the page change to allow expansion animation
      setTimeout(() => onPageChange(pageId), 150);
    } else {
      onPageChange(pageId);
    }
  };
  
  const navigationItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview & monitoring"
    },
    {
      id: "analytics",
      name: "Analytics", 
      icon: BarChart3,
      description: "Advanced analytics"
    },
    {
      id: "configuration",
      name: "Configuration",
      icon: Settings,
      description: "System settings"
    },
    {
      id: "reports",
      name: "Reports",
      icon: FileText,
      description: "Generate reports"
    },
    {
      id: "settings",
      name: "Settings & Profile",
      icon: User,
      description: "User preferences"
    }
  ];

  return (
    <div className="ml-6 my-6">
      <div 
        className={cn(
          "flex flex-col h-[calc(100vh-3rem)] transition-all duration-300 ease-in-out rounded-3xl",
          "bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent shadow-2xl border border-sidebar-border/20 overflow-hidden",
          isExpanded ? "w-64" : "w-20"
        )}
      >
        {/* Header with Logo */}
        <div className="p-6 flex flex-col items-center relative">
          {/* Close button when expanded */}
          {isExpanded && (
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <X className="w-4 h-4 text-sidebar-foreground" />
            </button>
          )}
          
          <div className="w-12 h-12 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {isExpanded && (
            <div className="mt-3 text-center">
              <h2 className="text-sidebar-foreground font-semibold text-base whitespace-nowrap">
                EMS Control
              </h2>
              <p className="text-sidebar-foreground/70 text-xs whitespace-nowrap mt-1">
                Energy Management
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleNavigationClick(item.id)}
                    className={cn(
                      "transition-all duration-300 flex items-center relative overflow-hidden",
                      "hover:scale-110 hover:shadow-lg",
                      isExpanded 
                        ? "w-full px-4 py-3 justify-start rounded-xl" 
                        : "w-12 h-12 justify-center mx-auto rounded-full",
                      isActive
                        ? "bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 shadow-lg shadow-sidebar-primary/30 scale-105"
                        : "bg-gradient-to-br from-sidebar-accent to-sidebar-accent/80 hover:from-sidebar-primary/80 hover:to-sidebar-primary/60"
                    )}
                  >
                    <Icon className={cn(
                      "transition-colors duration-300 flex-shrink-0",
                      "w-5 h-5",
                      isActive 
                        ? "text-sidebar-primary-foreground" 
                        : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground"
                    )} />
                    
                    {isExpanded && (
                      <div className="ml-3 overflow-hidden">
                        <div className={cn(
                          "font-medium text-sm whitespace-nowrap transition-colors duration-300",
                          isActive 
                            ? "text-sidebar-primary-foreground" 
                            : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground"
                        )}>
                          {item.name}
                        </div>
                        {isActive && (
                          <div className="text-xs text-sidebar-primary-foreground/70 mt-0.5 whitespace-nowrap">
                            {item.description}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Active indicator */}
                    {isActive && !isExpanded && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-sidebar-primary opacity-20 animate-pulse" />
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-l-full" />
                      </>
                    )}
                    
                    {/* Active indicator for expanded state */}
                    {isActive && isExpanded && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-sidebar-primary-foreground rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Tooltip for collapsed state */}
                  {!isExpanded && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs opacity-75 mt-1">{item.description}</div>
                      {/* Tooltip arrow */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 flex justify-center">
          <div className="relative group">
            <div 
              className="w-12 h-12 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="text-sidebar-primary-foreground font-semibold text-lg">LG</span>
            </div>
            
            {/* Profile tooltip for collapsed state */}
            {!isExpanded && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                <div className="font-medium text-sm">Liam Gallagher</div>
                <div className="text-xs opacity-75 mt-1">System Administrator</div>
                {/* Tooltip arrow */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
              </div>
            )}
            
            {/* Profile info for expanded state */}
            {isExpanded && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-center">
                <div className="text-sidebar-foreground font-medium text-sm whitespace-nowrap">
                  Liam Gallagher
                </div>
                <div className="text-sidebar-foreground/70 text-xs whitespace-nowrap">
                  System Administrator
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
