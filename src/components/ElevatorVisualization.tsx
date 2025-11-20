"use client";

import { Card, Space, Typography, Badge } from "antd";
import { 
  UpOutlined, 
  DownOutlined, 
  PauseCircleOutlined 
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface ElevatorVisualizationProps {
  elevator: {
    id: string;
    name: string;
    currentFloor: number;
    status: string;
    direction: string | null;
  };
  totalFloors: number;
}

export default function ElevatorVisualization({ 
  elevator, 
  totalFloors 
}: ElevatorVisualizationProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "default";
      case "moving_up":
        return "processing";
      case "moving_down":
        return "warning";
      case "maintenance":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "idle":
        return "Arrêté";
      case "moving_up":
        return "⬆️ Montée";
      case "moving_down":
        return "⬇️ Descente";
      case "maintenance":
        return "⚠️ Maintenance";
      default:
        return status;
    }
  };

  return (
    <Card 
      className="shadow-2xl bg-slate-800 border-slate-700"
      title={
        <Space>
          <Title level={4} className="!mb-0 text-white">{elevator.name}</Title>
          <Badge 
            status={getStatusColor(elevator.status) as any}
            text={<span className="text-slate-300">{getStatusText(elevator.status)}</span>}
          />
        </Space>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vue du bâtiment */}
        <div>
          <Text className="block mb-3 text-slate-300 font-semibold">Vue du bâtiment</Text>
          <div className="relative bg-slate-900 rounded-lg p-6 border-4 border-slate-700" style={{ minHeight: "500px" }}>
            {/* Structure du bâtiment */}
            <div className="relative h-full flex flex-col justify-between">
              {Array.from({ length: totalFloors }, (_, i) => {
                const floorNum = totalFloors - 1 - i;
                const isCurrentFloor = floorNum === elevator.currentFloor;
                
                return (
                  <div
                    key={floorNum}
                    className="relative flex items-center"
                    style={{ height: `${100 / totalFloors}%` }}
                  >
                    {/* Étage */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-700 px-3 py-1 rounded-l-lg border-2 border-slate-600 z-10">
                      <Text strong className="text-white">
                        {floorNum === 0 ? "RDC" : floorNum}
                      </Text>
                    </div>
                    
                    {/* Ligne d'étage */}
                    <div className="absolute left-12 right-0 top-0 h-px bg-slate-600"></div>
                    
                    {/* Cabine d'ascenseur */}
                    {isCurrentFloor && (
                      <div 
                        className="absolute left-16 top-1/2 -translate-y-1/2 w-20 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-2xl border-4 border-blue-400 flex items-center justify-center z-20 animate-pulse"
                        style={{
                          boxShadow: "0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.3)"
                        }}
                      >
                        <div className="text-white text-2xl font-bold">
                          {elevator.direction === "up" ? "⬆️" : elevator.direction === "down" ? "⬇️" : "⏸️"}
                        </div>
                      </div>
                    )}
                    
                    {/* Indicateurs de position */}
                    {!isCurrentFloor && (
                      <div className="absolute left-16 top-1/2 -translate-y-1/2 w-20 h-2 bg-slate-700 rounded"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indicateur numérique */}
        <div className="flex flex-col justify-center items-center">
          <div className="mb-6">
            <Text className="block text-center mb-4 text-slate-300 text-lg">Étage actuel</Text>
            <div className="bg-black rounded-2xl p-8 border-4 border-slate-600 shadow-2xl">
              <div className="text-center">
                <div className="text-8xl font-bold text-red-500 font-mono tracking-wider" style={{ 
                  textShadow: "0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)",
                  fontFamily: "monospace"
                }}>
                  {elevator.currentFloor === 0 ? "RC" : elevator.currentFloor.toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Indicateur de direction */}
          <div className="w-full">
            <Text className="block text-center mb-4 text-slate-300 text-lg">Direction</Text>
            <div className="flex justify-center gap-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                elevator.direction === "up" 
                  ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50" 
                  : "bg-slate-700 border-slate-600"
              }`}>
                <UpOutlined className={`text-3xl ${elevator.direction === "up" ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                elevator.direction === "down" 
                  ? "bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/50" 
                  : "bg-slate-700 border-slate-600"
              }`}>
                <DownOutlined className={`text-3xl ${elevator.direction === "down" ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                elevator.status === "idle" 
                  ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50" 
                  : "bg-slate-700 border-slate-600"
              }`}>
                <PauseCircleOutlined className={`text-3xl ${elevator.status === "idle" ? "text-white" : "text-slate-500"}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

