import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ConsumptionChartProps {
  selectedDay: string;
  selectedDevice: string;
}

function ColorDot({ color, className }: { color: string; className: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.style.setProperty('--swatch-color', color);
  }, [color]);
  return <div ref={ref} className={className} />;
}

export function ConsumptionChart({ selectedDay, selectedDevice }: ConsumptionChartProps) {
  // Mock data - in real app this would come from API based on filters
  const consumptionData = [
    { name: "Device 1 - Main Building", value: 2400, color: "#22c55e" },
    { name: "Device 2 - Manufacturing", value: 4567, color: "#16a34a" },
    { name: "Device 3 - Office Block", value: 1890, color: "#15803d" },
    { name: "HVAC Systems", value: 3210, color: "#166534" },
    { name: "Lighting", value: 1250, color: "#14532d" },
    { name: "Equipment", value: 2100, color: "#052e16" },
  ];

  const totalConsumption = consumptionData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalConsumption) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toLocaleString()} kWh ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <ColorDot color={entry.color} className="chart-legend-swatch w-3 h-3 rounded-full" />
            <span className="text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border/30 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground">Energy Consumption Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of energy consumption across all live devices for {selectedDay}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Consumption Summary */}
          <div className="text-center space-y-1">
            <div className="text-3xl font-bold text-foreground">
              {totalConsumption.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total kWh consumption
            </div>
          </div>

          {/* Pie Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consumptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {consumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Device Status</h4>
            <div className="grid grid-cols-1 gap-2">
              {consumptionData.slice(0, 3).map((device, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <ColorDot color={device.color} className="subject-color-dot w-2 h-2 rounded-full" />
                    <span className="text-sm">{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{device.value.toLocaleString()} kWh</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
