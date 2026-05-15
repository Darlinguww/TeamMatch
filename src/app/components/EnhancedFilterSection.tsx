import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Filter, Search } from "lucide-react";

interface Device {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive" | "warning";
}

interface EnhancedFilterSectionProps {
  selectedFilterType: "device" | "virtual-group";
  selectedDevice: string;
  selectedDevices: string[];
  dataMode: string;
  selectedDay: string;
  onFilterTypeChange: (type: "device" | "virtual-group") => void;
  onDeviceChange: (deviceId: string) => void;
  onDevicesChange: (deviceIds: string[]) => void;
  onDataModeChange: (mode: string) => void;
  onDayChange: (day: string) => void;
  onApplyFilters: () => void;
}

export function EnhancedFilterSection({
  selectedFilterType,
  selectedDevice,
  selectedDevices,
  dataMode,
  selectedDay,
  onFilterTypeChange,
  onDeviceChange,
  onDevicesChange,
  onDataModeChange,
  onDayChange,
  onApplyFilters,
}: EnhancedFilterSectionProps) {
  const [isVirtualGroupDropdownOpen, setIsVirtualGroupDropdownOpen] = useState(false);

  // All individual devices
  const allDevices: Device[] = [
    { id: "device-1", name: "Main Building - Floor 1", location: "Building A", status: "active" },
    { id: "device-2", name: "Main Building - Floor 2", location: "Building A", status: "active" },
    { id: "device-3", name: "Manufacturing Unit 1", location: "Building B", status: "active" },
    { id: "device-4", name: "Manufacturing Unit 2", location: "Building B", status: "warning" },
    { id: "device-5", name: "Office Block A", location: "Building C", status: "active" },
    { id: "device-6", name: "Office Block B", location: "Building C", status: "active" },
    { id: "device-7", name: "Production Line A", location: "Building B", status: "active" },
    { id: "device-8", name: "Production Line B", location: "Building B", status: "active" },
    { id: "device-9", name: "Assembly Unit 1", location: "Building D", status: "active" },
    { id: "device-10", name: "Assembly Unit 2", location: "Building D", status: "inactive" },
  ];

  // Virtual groups with associated devices
  const virtualGroups = {
    "group-production": {
      name: "Production Group",
      devices: ["device-3", "device-4", "device-7", "device-8", "device-9", "device-10"]
    },
    "group-administration": {
      name: "Administration Group", 
      devices: ["device-1", "device-2", "device-5", "device-6"]
    }
  };

  const dataModes = [
    { id: "real-time", name: "Real-Time" },
    { id: "historical", name: "Historical" },
    { id: "combined", name: "Combined" },
  ];

  const timePerl = [
    { id: "today", name: "Today" },
    { id: "yesterday", name: "Yesterday" },
    { id: "last-7-days", name: "Last 7 Days" },
    { id: "last-30-days", name: "Last 30 Days" },
  ];

  const handleVirtualGroupDeviceToggle = (deviceId: string) => {
    const newSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId];
    onDevicesChange(newSelection);
  };

  const getDevicesForGroup = (groupId: string): Device[] => {
    const group = virtualGroups[groupId as keyof typeof virtualGroups];
    if (!group) return [];
    return allDevices.filter(device => group.devices.includes(device.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "warning": return "bg-yellow-500"; 
      case "inactive": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <Card className="border-border/30 shadow-sm mb-6 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Filter Type Selection */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Filter Type</label>
            <Select 
              value={selectedFilterType} 
              onValueChange={(value: "device" | "virtual-group") => onFilterTypeChange(value)}
            >
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device">Individual Device</SelectItem>
                <SelectItem value="virtual-group">Virtual Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Device/Group Selection */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {selectedFilterType === "device" ? "Select Device" : "Select Virtual Group & Devices"}
            </label>
            
            {selectedFilterType === "device" ? (
              <Select value={selectedDevice} onValueChange={onDeviceChange}>
                <SelectTrigger className="h-11 border-border/50 bg-background/50">
                  <SelectValue placeholder="Choose a device" />
                </SelectTrigger>
                <SelectContent>
                  {allDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      <div className="flex items-center gap-2 w-full">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`} />
                        <span className="flex-1">{device.name}</span>
                        <span className="text-xs text-muted-foreground">{device.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select 
                value={selectedDevice} 
                onValueChange={onDeviceChange}
                open={isVirtualGroupDropdownOpen}
                onOpenChange={setIsVirtualGroupDropdownOpen}
              >
                <SelectTrigger className="h-11 border-border/50 bg-background/50">
                  <SelectValue placeholder="Choose virtual group">
                    {selectedDevice && virtualGroups[selectedDevice as keyof typeof virtualGroups] && (
                      <div className="flex items-center gap-2">
                        <span>{virtualGroups[selectedDevice as keyof typeof virtualGroups].name}</span>
                        {selectedDevices.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {selectedDevices.length} devices selected
                          </Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[400px]">
                  {Object.entries(virtualGroups).map(([groupId, group]) => (
                    <div key={groupId}>
                      <SelectItem 
                        value={groupId}
                        onSelect={() => {
                          onDeviceChange(groupId);
                          // Don't close dropdown to allow device selection
                          setIsVirtualGroupDropdownOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.devices.length} devices
                          </Badge>
                        </div>
                      </SelectItem>
                      
                      {selectedDevice === groupId && (
                        <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Select devices:
                          </div>
                          {getDevicesForGroup(groupId).map((device) => (
                            <div 
                              key={device.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVirtualGroupDeviceToggle(device.id);
                              }}
                            >
                              <Checkbox
                                checked={selectedDevices.includes(device.id)}
                                onCheckedChange={() => handleVirtualGroupDeviceToggle(device.id)}
                                disabled={device.status === "inactive"}
                              />
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`} />
                              <span className="text-sm flex-1">{device.name}</span>
                              <span className="text-xs text-muted-foreground">{device.location}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data Mode */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Data Mode</label>
            <Select value={dataMode} onValueChange={onDataModeChange}>
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {dataModes.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Period */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Time Period</label>
            <Select value={selectedDay} onValueChange={onDayChange}>
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {timePerl.map((day) => (
                  <SelectItem key={day.id} value={day.id}>
                    {day.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Button */}
          <div className="flex gap-2">
            <Button onClick={onApplyFilters} className="h-11 px-6 bg-primary hover:bg-primary/90 shadow-sm">
              <Filter className="w-4 h-4 mr-2" />
              Apply Filter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
