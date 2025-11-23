"use client";

import { useEffect, useState } from "react";
import { Card, Space, Typography, Badge } from "antd";
import { 
  UpOutlined, 
  DownOutlined, 
  PauseCircleOutlined 
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Passenger {
  id: string;
  destinationFloor: number;
  enteredAt: number;
}

interface ElevatorVisualizationProps {
  elevator: {
    id: string;
    name: string;
    currentFloor: number;
    status: string;
    direction: string | null;
  };
  totalFloors: number;
  passengers: Passenger[]; // Passagers en mémoire
  onUpdate?: () => void;
}

export default function ElevatorVisualization({ 
  elevator, 
  totalFloors,
  passengers = [],
  onUpdate
}: ElevatorVisualizationProps) {
  const passengerCount = passengers.length;
  const [isMoving, setIsMoving] = useState(false);

  // Système de mouvement automatique (seulement si l'ascenseur est déjà en mouvement)
  useEffect(() => {
    if (elevator.status === "moving_up" || elevator.status === "moving_down") {
      setIsMoving(true);
      const interval = setInterval(async () => {
        try {
          // Trouver la prochaine destination
          let nextFloor: number | null = null;
          
          if (passengers.length > 0) {
            const destinations = passengers.map(p => p.destinationFloor);
            
            if (elevator.direction === "up") {
              const goingUp = destinations.filter(d => d > elevator.currentFloor);
              if (goingUp.length > 0) {
                nextFloor = Math.min(...goingUp);
              } else {
                // Plus de destinations vers le haut, changer de direction
                const goingDown = destinations.filter(d => d <= elevator.currentFloor);
                if (goingDown.length > 0) {
                  nextFloor = Math.max(...goingDown);
                }
              }
            } else if (elevator.direction === "down") {
              const goingDown = destinations.filter(d => d <= elevator.currentFloor);
              if (goingDown.length > 0) {
                nextFloor = Math.max(...goingDown);
              } else {
                // Plus de destinations vers le bas, changer de direction
                const goingUp = destinations.filter(d => d > elevator.currentFloor);
                if (goingUp.length > 0) {
                  nextFloor = Math.min(...goingUp);
                }
              }
            } else {
              // Pas de direction, choisir la destination la plus proche
              const closest = destinations.reduce((closest, current) => 
                Math.abs(current - elevator.currentFloor) < Math.abs(closest - elevator.currentFloor) 
                  ? current : closest
              );
              nextFloor = closest;
            }
          }

          // Si on est déjà à la destination, ne pas bouger
          if (nextFloor === elevator.currentFloor) {
            // Vérifier s'il y a des passagers à destination
            const passengersAtFloor = passengers.filter(p => p.destinationFloor === elevator.currentFloor);
            if (passengersAtFloor.length === 0) {
              // Plus de destinations, arrêter
              await fetch(`/api/elevator`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: elevator.id,
                  status: "idle",
                  direction: null,
                }),
              });
              if (onUpdate) onUpdate();
            }
            return;
          }

          if (!nextFloor) {
            // Plus de destinations, arrêter
            await fetch(`/api/elevator`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: elevator.id,
                status: "idle",
                direction: null,
              }),
            });
            if (onUpdate) onUpdate();
            return;
          }

          // Déplacer d'un étage à la fois
          const step = elevator.currentFloor < nextFloor ? 1 : -1;
          const newFloor = elevator.currentFloor + step;
          const direction = elevator.currentFloor < newFloor ? "up" : "down";

          // Mettre à jour l'ascenseur
          await fetch(`/api/elevator`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: elevator.id,
              currentFloor: newFloor,
              status: direction === "up" ? "moving_up" : "moving_down",
              direction: direction,
            }),
          });

          if (onUpdate) onUpdate();
        } catch (error) {
          console.error("Error auto-moving:", error);
        }
      }, 1500); // Déplacer toutes les 1.5 secondes

      return () => clearInterval(interval);
    } else {
      setIsMoving(false);
    }
  }, [elevator.status, elevator.id, elevator.currentFloor, elevator.direction, passengers, onUpdate]);

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

  // Calculer la position verticale de l'ascenseur (0 = haut, 100 = bas)
  const elevatorPosition = ((totalFloors - 1 - elevator.currentFloor) / (totalFloors - 1)) * 100;

  return (
    <Card 
      className="shadow-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-slate-700/50 backdrop-blur-sm"
      title={
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Space size="middle">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <span className="text-2xl">🚇</span>
            </div>
            <div>
              <Title level={4} className="!mb-0 text-white font-semibold">{elevator.name}</Title>
              <Text className="text-slate-400 text-xs">Étage {elevator.currentFloor === 0 ? "RDC" : elevator.currentFloor}</Text>
            </div>
          </Space>
          <Badge 
            status={getStatusColor(elevator.status) as any}
            text={<span className="text-slate-200 font-medium">{getStatusText(elevator.status)}</span>}
            className="ml-auto"
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vue du bâtiment avec ascenseur */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-700/50 rounded-lg">
              <span className="text-xl">🏢</span>
            </div>
            <Text className="text-slate-200 font-semibold text-lg">Vue du bâtiment</Text>
          </div>
          <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl p-6 border-2 border-slate-700/50 shadow-2xl shadow-black/50" style={{ minHeight: "650px" }}>
            {/* Structure du bâtiment */}
            <div className="relative h-full">
              {/* Shaft de l'ascenseur - Plus visible et réaliste */}
              <div className="absolute left-1/4 w-40 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-l-4 border-r-4 border-slate-600/80 rounded-lg shadow-2xl shadow-black/40">
                {/* Lignes verticales pour l'effet de profondeur */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/50"></div>
                <div className="absolute left-1/4 top-0 bottom-0 w-px bg-slate-600/30"></div>
                <div className="absolute right-1/4 top-0 bottom-0 w-px bg-slate-600/30"></div>
                {/* Ascenseur mobile - Plus réaliste */}
                <div 
                  className="absolute left-3 right-3 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 rounded-lg shadow-2xl border-4 border-blue-400 transition-all duration-1000 ease-in-out"
                  style={{
                    height: `${100 / totalFloors}%`,
                    bottom: `${elevatorPosition}%`,
                    boxShadow: isMoving 
                      ? "0 0 50px rgba(59, 130, 246, 1), 0 0 100px rgba(59, 130, 246, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.4)" 
                      : "0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.2)",
                    animation: isMoving ? "pulse 1.5s infinite" : "none",
                    zIndex: 10
                  }}
                >
                  {/* Portes de l'ascenseur - Plus détaillées */}
                  <div className="h-full flex items-center justify-center relative overflow-hidden">
                    {/* Portes avec effet de séparation */}
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 bg-gradient-to-r from-blue-400/40 to-blue-500/20 border-r-4 border-blue-300/60 shadow-inner"></div>
                      <div className="w-1/2 bg-gradient-to-l from-blue-400/40 to-blue-500/20 border-l-4 border-blue-300/60 shadow-inner"></div>
                    </div>
                    {/* Poignées de porte */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-300 rounded-full"></div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-300 rounded-full"></div>
                    
                    {/* Indicateur de direction dans l'ascenseur */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        elevator.direction === "up" 
                          ? "bg-green-500 animate-bounce" 
                          : elevator.direction === "down" 
                          ? "bg-orange-500 animate-bounce" 
                          : "bg-gray-500"
                      }`}>
                        {elevator.direction === "up" ? "⬆️" : elevator.direction === "down" ? "⬇️" : "⏸️"}
                      </div>
                    </div>

                    {/* Passagers dans l'ascenseur - Triés par ordre d'entrée */}
                    {passengerCount > 0 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center z-10 px-2">
                        {passengers
                          .sort((a, b) => a.enteredAt - b.enteredAt) // Trier par ordre d'entrée
                          .slice(0, 8)
                          .map((passenger, index) => (
                            <div
                              key={passenger.id}
                              className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full border-2 border-yellow-300 shadow-lg relative"
                              title={`Passager ${index + 1} → ${passenger.destinationFloor === 0 ? "RDC" : `Étage ${passenger.destinationFloor}`}`}
                            >
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-yellow-900">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        {passengerCount > 8 && (
                          <div className="w-6 h-6 bg-yellow-300 rounded-full border-2 border-yellow-200 flex items-center justify-center text-[9px] text-yellow-900 font-bold shadow-lg">
                            +{passengerCount - 8}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Étages avec numéros */}
              {Array.from({ length: totalFloors }, (_, i) => {
                const floorNum = totalFloors - 1 - i;
                const floorPosition = (i / (totalFloors - 1)) * 100;
                const isCurrentFloor = floorNum === elevator.currentFloor;
                
                return (
                  <div
                    key={floorNum}
                    className="absolute left-0 right-0 flex items-center"
                    style={{ 
                      bottom: `${floorPosition}%`,
                      height: `${100 / totalFloors}%`
                    }}
                  >
                    {/* Numéro d'étage à gauche - Plus visible */}
                    <div className={`absolute left-2 px-4 py-2 rounded-xl font-bold text-xl z-20 transition-all ${
                      isCurrentFloor 
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-2xl shadow-blue-500/70 scale-110 ring-4 ring-blue-400/50" 
                        : "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-300 shadow-md"
                    }`}>
                      {floorNum === 0 ? "RDC" : floorNum}
                    </div>

                    {/* Ligne d'étage - Plus épaisse et visible */}
                    <div className={`absolute left-1/4 right-0 h-1 transition-all ${
                      isCurrentFloor 
                        ? "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 shadow-lg shadow-blue-400/50" 
                        : "bg-gradient-to-r from-slate-600 to-slate-500"
                    }`}></div>
                    
                    {/* Indicateur de plancher */}
                    <div className={`absolute left-[calc(25%+11rem)] w-16 h-1 rounded-full ${
                      isCurrentFloor ? "bg-blue-400" : "bg-slate-600"
                    }`}></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panneau de contrôle de l'ascenseur */}
        <div className="flex flex-col gap-4">
          {/* Écran d'affichage de l'étage */}
          <div className="bg-gradient-to-br from-black via-slate-900 to-black rounded-2xl p-6 border-2 border-slate-700/50 shadow-2xl shadow-red-500/20">
            <Text className="block text-center mb-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">Étage actuel</Text>
            <div className="text-center">
              <div className="text-7xl font-bold text-red-500 font-mono tracking-wider" style={{ 
                textShadow: "0 0 30px rgba(239, 68, 68, 1), 0 0 60px rgba(239, 68, 68, 0.6)",
                fontFamily: "monospace",
                lineHeight: "1"
              }}>
                {elevator.currentFloor === 0 ? "RC" : elevator.currentFloor.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Indicateurs de direction */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border-2 border-slate-700/50 shadow-lg">
            <Text className="block text-center mb-4 text-slate-200 text-xs font-semibold uppercase tracking-wider">Direction</Text>
            <div className="flex justify-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                elevator.direction === "up" 
                  ? "bg-gradient-to-br from-green-500 to-green-600 border-green-400 shadow-lg shadow-green-500/50 scale-110" 
                  : "bg-slate-700/50 border-slate-600"
              }`}>
                <UpOutlined className={`text-2xl ${elevator.direction === "up" ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                elevator.direction === "down" 
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-lg shadow-orange-500/50 scale-110" 
                  : "bg-slate-700/50 border-slate-600"
              }`}>
                <DownOutlined className={`text-2xl ${elevator.direction === "down" ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                elevator.status === "idle" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-110" 
                  : "bg-slate-700/50 border-slate-600"
              }`}>
                <PauseCircleOutlined className={`text-2xl ${elevator.status === "idle" ? "text-white" : "text-slate-500"}`} />
              </div>
            </div>
          </div>

          {/* Informations sur les passagers */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border-2 border-slate-700/50 shadow-lg">
            <Text className="block text-center mb-4 text-slate-200 text-xs font-semibold uppercase tracking-wider">Passagers</Text>
            <div className="text-center mb-4">
              <Text className="text-white text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">{passengerCount}</Text>
              <Text className="block text-slate-400 text-xs mt-2">dans l'ascenseur</Text>
            </div>
            {passengers.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                {passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className="bg-gradient-to-r from-slate-700/50 to-slate-700/30 rounded-lg px-3 py-2.5 text-sm border border-slate-600/50 hover:from-slate-600/50 hover:to-slate-600/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-900">
                        👤
                      </div>
                      <Text className="text-yellow-300 font-semibold">Passager</Text>
                    </div>
                    <Text className="block text-slate-300 text-xs mt-1.5 ml-8">
                      → {passenger.destinationFloor === 0 ? "RDC" : `Étage ${passenger.destinationFloor}`}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
