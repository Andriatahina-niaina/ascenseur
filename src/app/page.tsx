"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Typography, Button, Spin, message } from "antd";
import { 
  HomeOutlined,
  ReloadOutlined 
} from "@ant-design/icons";
import ElevatorVisualization from "@/components/ElevatorVisualization";
import ControlPanel from "@/components/ControlPanel";
import RequestList from "@/components/RequestList";

const { Title } = Typography;

interface Building {
  id: string;
  name: string;
  totalFloors: number;
  elevators: Elevator[];
}

interface Elevator {
  id: string;
  name: string;
  currentFloor: number;
  status: string;
  direction: string | null;
}

export default function Home() {
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null);

  const fetchBuilding = useCallback(async () => {
    try {
      const response = await fetch("/api/building");
      console.log(response)
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setBuilding(data);
      
      // Mettre à jour l'ascenseur sélectionné
      if (data.elevators && data.elevators.length > 0) {
        setSelectedElevator((prev) => {
          if (!prev) {
            return data.elevators[0];
          }
          // Trouver l'ascenseur mis à jour
          const updated = data.elevators.find((e: Elevator) => e.id === prev.id);
          return updated || prev;
        });
      }
    } catch (error) {
      console.error("Error fetching building:", error);
      if (loading) {
        message.error("Erreur lors du chargement des données");
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchBuilding();
    // Rafraîchir toutes les 2 secondes pour voir les changements en temps réel
    const interval = setInterval(fetchBuilding, 2000);
    return () => clearInterval(interval);
  }, [fetchBuilding]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
        <Spin size="large" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
        <Card>
          <Title level={3}>Aucun bâtiment trouvé</Title>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <Card className="mb-6 shadow-2xl bg-slate-800 border-slate-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <Title level={2} className="!mb-2 text-white">
                <HomeOutlined className="mr-2 text-blue-400" />
                {building.name}
              </Title>
              <Typography.Text className="text-slate-300">
                {building.totalFloors} étages • {building.elevators.length} ascenseur(s)
              </Typography.Text>
            </div>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchBuilding}
              type="primary"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Actualiser
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Visualisation de l'ascenseur */}
          <div className="lg:col-span-2 space-y-6">
            {selectedElevator && (
              <>
                <ElevatorVisualization 
                  elevator={selectedElevator}
                  totalFloors={building.totalFloors}
                />
                
                <ControlPanel
                  elevator={selectedElevator}
                  buildingId={building.id}
                  totalFloors={building.totalFloors}
                  onUpdate={fetchBuilding}
                />
              </>
            )}
          </div>

          {/* Colonne droite - Liste des demandes */}
          <div>
            <RequestList buildingId={building.id} key={building.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
