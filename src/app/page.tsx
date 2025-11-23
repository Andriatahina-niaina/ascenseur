"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Typography, Button, Spin, message, InputNumber, Modal } from "antd";
import { 
  HomeOutlined,
  ReloadOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import ElevatorVisualization from "@/components/ElevatorVisualization";
import RequestList from "@/components/RequestList";

const { Title, Text } = Typography;

interface Building {
  id: string;
  name: string;
  totalFloors: number;
  elevators: Elevator[];
}

interface Passenger {
  id: string;
  destinationFloor: number;
  enteredAt: number; // timestamp
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
  const [passengers, setPassengers] = useState<Passenger[]>([]); // Passagers en mémoire
  const [addPassengerModalVisible, setAddPassengerModalVisible] = useState(false);
  const [destinationFloor, setDestinationFloor] = useState<number | null>(null);

  const fetchBuilding = useCallback(async () => {
    try {
      const response = await fetch("/api/building");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setBuilding(data);
      
      // Mettre à jour l'ascenseur sélectionné
      if (data.elevators && data.elevators.length > 0) {
        setSelectedElevator((prev) => {
          if (!prev) {
            return data.elevators[0];
          }
          // Trouver l'ascenseur mis à jour depuis la base de données
          const updated = data.elevators.find((e: Elevator) => e.id === prev.id);
          if (updated) {
            // Si l'ascenseur local est en idle et qu'on a des passagers, 
            // et que l'ascenseur dans la DB est aussi en idle, on garde idle
            // Si l'ascenseur dans la DB est en mouvement, on accepte la mise à jour (déjà démarré)
            if (prev.status === "idle" && passengers.length > 0 && updated.status === "idle") {
              // Garder l'ascenseur en idle - ne pas démarrer automatiquement
              return prev;
            }
            // Sinon, accepter la mise à jour (l'ascenseur est déjà en mouvement ou a été démarré manuellement)
            return updated;
          }
          return prev;
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
  }, [loading, passengers]);

  useEffect(() => {
    fetchBuilding();
    // Rafraîchir toutes les 2 secondes pour voir les changements en temps réel
    const interval = setInterval(fetchBuilding, 2000);
    return () => clearInterval(interval);
  }, [fetchBuilding]);

  // Fonction pour démarrer l'ascenseur manuellement
  const handleStartElevator = () => {
    if (!selectedElevator || passengers.length === 0) {
      message.warning("Aucun passager dans l'ascenseur");
      return;
    }

    if (selectedElevator.status !== "idle") {
      message.info("L'ascenseur est déjà en mouvement");
      return;
    }

    // Trouver la destination la plus proche
    const destinations = passengers.map(p => p.destinationFloor);
    const closest = destinations.reduce((closest, current) => 
      Math.abs(current - selectedElevator.currentFloor) < Math.abs(closest - selectedElevator.currentFloor) 
        ? current : closest
    );
    const direction = selectedElevator.currentFloor < closest ? "up" : "down";
    const newStatus = direction === "up" ? "moving_up" : "moving_down";

    // Mettre à jour l'état local
    setSelectedElevator(prev => prev ? {
      ...prev,
      status: newStatus,
      direction: direction,
    } : null);

    // Mettre à jour dans la base de données
    fetch(`/api/elevator`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: selectedElevator.id,
        status: newStatus,
        direction: direction,
      }),
    }).then(() => {
      fetchBuilding();
      message.success("Ascenseur démarré");
    }).catch(error => {
      console.error("Error starting elevator:", error);
      fetchBuilding();
      message.error("Erreur lors du démarrage de l'ascenseur");
    });
  };

  // Gérer la sortie des passagers quand l'ascenseur arrive à leur destination
  useEffect(() => {
    if (!selectedElevator) return;

    // Faire sortir les passagers qui arrivent à leur destination
    const passengersToExit = passengers
      .filter(p => p.destinationFloor === selectedElevator.currentFloor)
      .sort((a, b) => a.enteredAt - b.enteredAt); // Trier par ordre d'entrée (premier entré = premier sorti)

    if (passengersToExit.length > 0) {
      // Sortir un passager à la fois (le premier entré)
      const passengerToExit = passengersToExit[0];
      setTimeout(() => {
        setPassengers(prev => prev.filter(p => p.id !== passengerToExit.id));
        message.success(`Passager sorti à l'étage ${selectedElevator.currentFloor === 0 ? "RDC" : selectedElevator.currentFloor}`);
      }, 500);
    }
  }, [selectedElevator?.currentFloor, passengers]);

  const handleAddPassenger = () => {
    if (destinationFloor === null || destinationFloor === undefined) {
      message.warning("Veuillez sélectionner un étage de destination");
      return;
    }

    if (destinationFloor === selectedElevator?.currentFloor) {
      message.warning("Vous êtes déjà à cet étage");
      return;
    }

    const newPassenger: Passenger = {
      id: `passenger-${Date.now()}-${Math.random()}`,
      destinationFloor: destinationFloor,
      enteredAt: Date.now(),
    };

    setPassengers(prev => [...prev, newPassenger]);
    message.success(`Passager entré, destination: ${destinationFloor === 0 ? "RDC" : `Étage ${destinationFloor}`}`);
    
    setAddPassengerModalVisible(false);
    setDestinationFloor(null);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête amélioré */}
        <Card className="shadow-2xl bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800 border-slate-700/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="space-y-1">
              <Title level={2} className="!mb-0 text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <HomeOutlined className="text-blue-400 text-2xl" />
                </div>
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {building.name}
                </span>
              </Title>
              <div className="flex items-center gap-3 ml-14">
                <Typography.Text className="text-slate-400 text-sm font-medium">
                  {building.totalFloors} étages
                </Typography.Text>
                <span className="text-slate-600">•</span>
                <Typography.Text className="text-slate-400 text-sm font-medium">
                  {building.elevators.length} ascenseur{building.elevators.length > 1 ? 's' : ''}
                </Typography.Text>
              </div>
            </div>
            <Space size="middle" wrap className="w-full md:w-auto">
              <Button 
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setAddPassengerModalVisible(true)}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-0 shadow-lg shadow-green-500/30 h-10 px-6 font-semibold"
                size="large"
              >
                Entrer dans l'ascenseur
              </Button>
              {selectedElevator && passengers.length > 0 ? (
                <Button 
                  type="primary"
                  onClick={handleStartElevator}
                  className={`h-10 px-6 font-semibold border-0 shadow-lg ${
                    selectedElevator.status === "idle" 
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/30" 
                      : "bg-gradient-to-r from-gray-600 to-gray-500 shadow-gray-500/20 cursor-not-allowed"
                  }`}
                  size="large"
                  disabled={selectedElevator.status !== "idle"}
                  style={{ minWidth: "200px" }}
                >
                  {selectedElevator.status === "idle" ? "▶️ Démarrer l'ascenseur" : "⏸️ Ascenseur en mouvement"}
                </Button>
              ) : null}
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchBuilding}
                type="primary"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border-0 shadow-lg shadow-blue-500/30 h-10 px-5 font-semibold"
                size="large"
              >
                Actualiser
              </Button>
            </Space>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Visualisation de l'ascenseur */}
          <div className="lg:col-span-2">
            {selectedElevator && (
              <ElevatorVisualization 
                elevator={selectedElevator}
                totalFloors={building.totalFloors}
                passengers={passengers}
                onUpdate={fetchBuilding}
              />
            )}
          </div>

          {/* Colonne droite - Liste des demandes */}
          <div className="lg:sticky lg:top-6 h-fit">
            <RequestList buildingId={building.id} key={building.id} />
          </div>
        </div>
      </div>

      {/* Modal pour entrer dans l'ascenseur */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserAddOutlined className="text-green-400 text-xl" />
            </div>
            <span className="text-xl font-semibold text-white">Entrer dans l'ascenseur</span>
          </div>
        }
        open={addPassengerModalVisible}
        onOk={handleAddPassenger}
        onCancel={() => {
          setAddPassengerModalVisible(false);
          setDestinationFloor(null);
        }}
        okText="Entrer"
        cancelText="Annuler"
        okButtonProps={{ 
          className: "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-0 shadow-lg shadow-green-500/30 h-10 px-6 font-semibold"
        }}
        cancelButtonProps={{
          className: "h-10 px-6 font-semibold"
        }}
        className="[&_.ant-modal-content]:bg-slate-800 [&_.ant-modal-content]:border-slate-700"
        width={500}
      >
        <div className="space-y-6 pt-4">
          <div>
            <Text strong className="block mb-3 text-slate-200 text-base">
              À quel étage souhaitez-vous aller ?
            </Text>
            <InputNumber
              min={0}
              max={building.totalFloors - 1}
              value={destinationFloor}
              onChange={(value) => setDestinationFloor(value)}
              placeholder="Sélectionner l'étage de destination"
              className="w-full [&_.ant-input-number-input]:text-center [&_.ant-input-number-input]:text-lg [&_.ant-input-number-input]:font-semibold"
              size="large"
              formatter={(value) => value === 0 ? "RDC" : String(value)}
              parser={(value) => (value === "RDC" ? 0 : Number(value))}
            />
          </div>
          {selectedElevator && (
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <Text className="text-slate-400 text-sm">
                Étage actuel: <span className="text-slate-200 font-semibold">
                  {selectedElevator.currentFloor === 0 ? "RDC" : `Étage ${selectedElevator.currentFloor}`}
                </span>
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
