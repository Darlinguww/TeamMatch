import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, BarChart3, Waves } from "lucide-react";

interface AnalyticsData {
  deviceId: string;
  timestamp: string;
  kvah: number;
  billing: number;
  kva: number;
  kw: number;
  kwh: number;
  pf: number;
  kvarh_lag: number;
  kvarh_lead: number;
  co2_emissions: number;
}

interface AnalyticsChartProps {
  data: AnalyticsData[];
  graphType: string;
  deviceName: string;
}

export function AnalyticsChart({ data, graphType, deviceName }: AnalyticsChartProps) {
  const renderConsumptionChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="timestamp" 
          className="text-xs" 
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value: number, name: string) => [
            `${value.toFixed(2)} ${name === 'kwh' ? 'kWh' : name === 'kw' ? 'kW' : name === 'billing' ? '₹' : name.toUpperCase()}`,
            name === 'kwh' ? 'Energy Consumption' : 
            name === 'kw' ? 'Active Power' :
            name === 'billing' ? 'Billing Amount' : name.toUpperCase()
          ]}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="kwh"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#consumptionGradient)"
          name="Energy (kWh)"
        />
        <Line
          type="monotone"
          dataKey="kw"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          name="Power (kW)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderParameterizedChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="timestamp" 
          className="text-xs" 
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value: number, name: string) => [
            `${value.toFixed(2)} ${
              name === 'kvah' ? 'KVAH' :
              name === 'kva' ? 'KVA' :
              name === 'kw' ? 'KW' :
              name === 'pf' ? '' :
              name === 'kvarh_lag' ? 'KVARh' :
              name === 'kvarh_lead' ? 'KVARh' : ''
            }`,
            name === 'kvah' ? 'Apparent Energy' :
            name === 'kva' ? 'Apparent Power' :
            name === 'kw' ? 'Active Power' :
            name === 'pf' ? 'Power Factor' :
            name === 'kvarh_lag' ? 'Reactive Energy (Lag)' :
            name === 'kvarh_lead' ? 'Reactive Energy (Lead)' : name
          ]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="kvah"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          name="KVAH"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="kva"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          name="KVA"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="kw"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          name="KW"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="pf"
          stroke="hsl(var(--chart-4))"
          strokeWidth={2}
          name="Power Factor"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderHarmonicChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="timestamp" 
          className="text-xs" 
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value: number, name: string) => [
            `${value.toFixed(2)} KVARh`,
            name === 'kvarh_lag' ? 'Reactive Energy (Lag)' : 'Reactive Energy (Lead)'
          ]}
        />
        <Legend />
        <Bar
          dataKey="kvarh_lag"
          fill="hsl(var(--chart-4))"
          name="KVARh (Lag)"
          radius={[2, 2, 0, 0]}
        />
        <Bar
          dataKey="kvarh_lead"
          fill="hsl(var(--chart-5))"
          name="KVARh (Lead)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const getChartTitle = () => {
    switch (graphType) {
      case "consumption":
        return "Energy Consumption Trends";
      case "parameterized":
        return "Parameterized Power Analysis";
      case "harmonic":
        return "Harmonic Analysis - Reactive Power";
      default:
        return "Energy Analysis";
    }
  };

  const getChartDescription = () => {
    switch (graphType) {
      case "consumption":
        return "Real-time energy consumption and active power monitoring";
      case "parameterized":
        return "Comprehensive power parameters including KVAH, KVA, KW, and Power Factor";
      case "harmonic":
        return "Reactive power analysis showing lag and lead components";
      default:
        return "Energy system analysis";
    }
  };

  const getChartIcon = () => {
    switch (graphType) {
      case "consumption":
        return TrendingUp;
      case "parameterized":
        return BarChart3;
      case "harmonic":
        return Waves;
      default:
        return TrendingUp;
    }
  };

  const ChartIcon = getChartIcon();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-primary" />
          {getChartTitle()}
        </CardTitle>
        <CardDescription>
          {getChartDescription()} for {deviceName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Controls */}
          <Tabs value={graphType} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="consumption" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Consumption
              </TabsTrigger>
              <TabsTrigger value="parameterized" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Parameters
              </TabsTrigger>
              <TabsTrigger value="harmonic" className="flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Harmonic
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Chart Display */}
          <div className="w-full">
            {graphType === "consumption" && renderConsumptionChart()}
            {graphType === "parameterized" && renderParameterizedChart()}
            {graphType === "harmonic" && renderHarmonicChart()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
