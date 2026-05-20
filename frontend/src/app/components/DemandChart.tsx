import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function TooltipColorBar({ color }: { color: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.style.setProperty('--bar-color', color);
  }, [color]);
  return <div ref={ref} className="tooltip-color-bar w-3 h-1 rounded" />;
}

interface DemandChartProps {
  dataMode: string;
  selectedDay: string;
}

export function DemandChart({ dataMode, selectedDay }: DemandChartProps) {
  // Mock data - in real app this would come from API based on filters
  const demandData = [
    { time: "00:00", maxDemand: 1200, actualDemand: 890 },
    { time: "02:00", maxDemand: 1200, actualDemand: 750 },
    { time: "04:00", maxDemand: 1200, actualDemand: 650 },
    { time: "06:00", maxDemand: 1200, actualDemand: 980 },
    { time: "08:00", maxDemand: 1200, actualDemand: 1150 },
    { time: "10:00", maxDemand: 1200, actualDemand: 1080 },
    { time: "12:00", maxDemand: 1200, actualDemand: 1190 },
    { time: "14:00", maxDemand: 1200, actualDemand: 1240 },
    { time: "16:00", maxDemand: 1200, actualDemand: 1180 },
    { time: "18:00", maxDemand: 1200, actualDemand: 1350 },
    { time: "20:00", maxDemand: 1200, actualDemand: 1220 },
    { time: "22:00", maxDemand: 1200, actualDemand: 1010 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Time: ${label}`}</p>
          {payload.map((pld: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
              <TooltipColorBar color={pld.color} />
              <span className="text-sm">
                {pld.dataKey === 'maxDemand' ? 'Max Demand' : 'Actual Demand'}: {pld.value} kW
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const avgActualDemand = Math.round(demandData.reduce((sum, item) => sum + item.actualDemand, 0) / demandData.length);
  const peakDemand = Math.max(...demandData.map(item => item.actualDemand));
  const demandEfficiency = Math.round((avgActualDemand / 1200) * 100);

  return (
    <Card className="border-border/30 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground">Max vs Actual Demand</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparison of peak demand against actual usage over time ({dataMode})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-foreground">{avgActualDemand} kW</div>
              <div className="text-xs text-muted-foreground">Avg Demand</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-foreground">{peakDemand} kW</div>
              <div className="text-xs text-muted-foreground">Peak Demand</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-foreground">{demandEfficiency}%</div>
              <div className="text-xs text-muted-foreground">Efficiency</div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 1400]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="maxDemand"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Max Demand"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actualDemand"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Actual Demand"
                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#22c55e", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Demand Analysis */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Demand Analysis</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-sm">Peak Time</span>
                <span className="text-sm font-medium">18:00 (1,350 kW)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-sm">Low Demand Time</span>
                <span className="text-sm font-medium">04:00 (650 kW)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-sm">Demand Variance</span>
                <span className="text-sm font-medium">700 kW (58.3%)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
