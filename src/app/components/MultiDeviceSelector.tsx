import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Device {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive" | "warning";
  consumption: number;
}

interface MultiDeviceSelectorProps {
  selectedGroup: string;
  selectedDevices: string[];
  onDeviceSelectionChange: (deviceIds: string[]) => void;
}

export function MultiDeviceSelector({ 
  selectedGroup, 
  selectedDevices, 
  onDeviceSelectionChange 
}: MultiDeviceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Mock device data based on selected group
  const getDevicesForGroup = (groupId: string): Device[] => {
    if (groupId === "group-1") { // Production
      return [
        { id: "prod-1", name: "Production Line A", location: "Building 1", status: "active", consumption: 2400 },
        { id: "prod-2", name: "Production Line B", location: "Building 1", status: "active", consumption: 2100 },
        { id: "prod-3", name: "Assembly Unit 1", location: "Building 2", status: "warning", consumption: 1800 },
        { id: "prod-4", name: "Assembly Unit 2", location: "Building 2", status: "active", consumption: 1950 },
        { id: "prod-5", name: "Quality Control", location: "Building 3", status: "active", consumption: 800 },
      ];
    } else if (groupId === "group-2") { // Administration
      return [
        { id: "admin-1", name: "Office Block A", location: "Main Building", status: "active", consumption: 450 },
        { id: "admin-2", name: "Office Block B", location: "Main Building", status: "active", consumption: 380 },
        { id: "admin-3", name: "Conference Center", location: "Main Building", status: "inactive", consumption: 0 },
        { id: "admin-4", name: "Reception & Lobby", location: "Main Building", status: "active", consumption: 320 },
        { id: "admin-5", name: "Cafeteria", location: "Main Building", status: "active", consumption: 280 },
      ];
    }
    return [];
  };

  const devices = getDevicesForGroup(selectedGroup);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "inactive": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "warning": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case "inactive": return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleDeviceToggle = (deviceId: string) => {
    const newSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId];
    onDeviceSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const activeDeviceIds = devices.filter(d => d.status === "active").map(d => d.id);
    onDeviceSelectionChange(activeDeviceIds);
  };

  const handleSelectNone = () => {
    onDeviceSelectionChange([]);
  };

  if (devices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Device Selection for {selectedGroup === "group-1" ? "Production Group" : "Administration Group"}
            <Badge variant="outline">{selectedDevices.length}/{devices.length} selected</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        {isExpanded && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All Active
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectNone}>
              Select None
            </Button>
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={device.id}
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => handleDeviceToggle(device.id)}
                    disabled={device.status === "inactive"}
                  />
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`} />
                  <div>
                    <label 
                      htmlFor={device.id} 
                      className="font-medium cursor-pointer"
                    >
                      {device.name}
                    </label>
                    <p className="text-sm text-muted-foreground">{device.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {device.consumption.toLocaleString()} kWh
                    </div>
                    <div className="text-xs text-muted-foreground">Current usage</div>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
              </div>
            ))}
          </div>
          
          {selectedDevices.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-primary">
                    {selectedDevices.length} devices selected
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total consumption: {devices
                      .filter(d => selectedDevices.includes(d.id))
                      .reduce((sum, d) => sum + d.consumption, 0)
                      .toLocaleString()} kWh
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
