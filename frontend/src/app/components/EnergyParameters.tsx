import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EnergyParametersProps {
  dataMode: string;
  selectedDevice: string;
}

export function EnergyParameters({ dataMode, selectedDevice }: EnergyParametersProps) {
  // Mock data - in real app this would come from API
  const parameters = [
    {
      id: "kva",
      name: "KVA",
      fullName: "Apparent Power",
      value: "1,245.6",
      unit: "kVA",
      change: "+5.2%",
      trend: "up",
      status: "normal",
    },
    {
      id: "kwh",
      name: "KWH",
      fullName: "Energy Consumption",
      value: "8,932.4",
      unit: "kWh",
      change: "+12.8%",
      trend: "up",
      status: "high",
    },
    {
      id: "kvar",
      name: "KVAR",
      fullName: "Reactive Power",
      value: "342.1",
      unit: "kVAR",
      change: "-2.1%",
      trend: "down",
      status: "normal",
    },
    {
      id: "pf",
      name: "PF",
      fullName: "Power Factor",
      value: "0.92",
      unit: "",
      change: "0.0%",
      trend: "stable",
      status: "optimal",
    },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="size-4" />;
      case "down":
        return <TrendingDown className="size-4" />;
      default:
        return <Minus className="size-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "destructive";
      case "optimal":
        return "default";
      default:
        return "secondary";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-sidebar-primary";
      case "down":
        return "text-red-400";
      default:
        return "text-sidebar-foreground/70";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {parameters.map((param) => (
        <Card key={param.id} className="border-sidebar-border/30 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-accent backdrop-blur-sm hover:scale-[1.02] transform">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-sidebar-foreground">{param.name}</CardTitle>
            <Badge variant={getStatusColor(param.status) as any} className="text-xs bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-sm">
              {param.status}
            </Badge>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <div className="text-2xl font-bold text-sidebar-foreground">
                  {param.value}
                </div>
                {param.unit && (
                  <div className="text-sm text-sidebar-foreground/70">
                    {param.unit}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-sidebar-foreground/70">
                  {param.fullName}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(param.trend)}`}>
                  {getTrendIcon(param.trend)}
                  {param.change}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
