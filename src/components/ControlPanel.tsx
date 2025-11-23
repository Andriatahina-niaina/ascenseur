"use client";

import { useState } from "react";
import { Card, Space, Typography, Button, message, Modal, InputNumber, Input, List, Tag } from "antd";
import { PhoneOutlined, UserAddOutlined, EditOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Passenger {
  id: string;
  name: string;
  currentFloor: number;
  destinationFloor: number;
  status: string;
}

interface ControlPanelProps {
  elevator: {
    id: string;
    name: string;
    currentFloor: number;
    status: string;
    passengers?: Passenger[];
  };
  buildingId: string;
  totalFloors: number;
  onUpdate: () => void;
}

export default function ControlPanel({
  elevator,
  buildingId,
  totalFloors,
  onUpdate,
}: ControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [destinationFloor, setDestinationFloor] = useState<number | null>(null);
  const [addPassengerModalVisible, setAddPassengerModalVisible] = useState(false);
  const [newPassengerName, setNewPassengerName] = useState("");
  const [newPassengerDestination, setNewPassengerDestination] = useState<number | null>(null);
  const [editPassengerModalVisible, setEditPassengerModalVisible] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [editDestination, setEditDestination] = useState<number | null>(null);

  const handleFloorClick = async (floor: number) => {
    if (floor === elevator.currentFloor) {
      message.info("Vous êtes déjà à cet étage");
      return;
    }

    setLoading(true);
    try {
      // Créer une demande pour cet étage (cela permettra à l'ascenseur de s'y arrêter)
      const requestResponse = await fetch("/api/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId: buildingId,
          fromFloor: elevator.currentFloor,
          toFloor: floor,
          priority: 1,
        }),
      });

      if (!requestResponse.ok) {
        message.error("Erreur lors de la création de la demande");
        setLoading(false);
        return;
      }

      message.success(`Demande créée pour l'étage ${floor === 0 ? "RDC" : floor}. L'ascenseur s'y arrêtera.`);
      onUpdate();
    } catch (error) {
      message.error("Erreur lors de la création de la demande");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallElevator = async () => {
    if (selectedFloor === null || destinationFloor === null) {
      message.warning("Veuillez sélectionner un étage de départ et d'arrivée");
      return;
    }

    if (selectedFloor === destinationFloor) {
      message.warning("L'étage de destination doit être différent de l'étage de départ");
      return;
    }

    setLoading(true);
    try {
      // Créer la demande
      const requestResponse = await fetch("/api/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId,
          fromFloor: selectedFloor,
          toFloor: destinationFloor,
          priority: 0,
        }),
      });

      if (!requestResponse.ok) {
        message.error("Erreur lors de l'appel de l'ascenseur");
        setLoading(false);
        return;
      }

      const requestData = await requestResponse.json();
      message.success(
        `Ascenseur appelé de l'étage ${selectedFloor === 0 ? "RDC" : selectedFloor} vers l'étage ${destinationFloor === 0 ? "RDC" : destinationFloor}`
      );
      
      setCallModalVisible(false);
      setSelectedFloor(null);
      setDestinationFloor(null);
      
      // Rafraîchir pour obtenir les données à jour
      onUpdate();
      
      // Si un ascenseur a été assigné, simuler son mouvement
      if (requestData.elevator?.id) {
        const elevatorId = requestData.elevator.id;
        
        // Attendre un peu pour que l'assignation soit complète
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Récupérer l'état actuel de l'ascenseur
        const elevatorResponse = await fetch("/api/elevator");
        const elevators = await elevatorResponse.json();
        const assignedElevator = elevators.find((e: any) => e.id === elevatorId);
        
        if (assignedElevator) {
          // Déplacer l'ascenseur vers l'étage de départ d'abord
          const startFloor = assignedElevator.currentFloor;
          if (startFloor !== selectedFloor) {
            const step = startFloor < selectedFloor ? 1 : -1;
            const totalSteps = Math.abs(selectedFloor - startFloor);
            
            for (let i = 1; i <= totalSteps; i++) {
              const currentStepFloor = startFloor + (step * i);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              await fetch(`/api/elevator/${elevatorId}/move`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  targetFloor: currentStepFloor,
                }),
              });
              onUpdate();
            }
          }
          
          // Ensuite, déplacer vers l'étage de destination
          if (selectedFloor !== destinationFloor) {
            const step2 = selectedFloor < destinationFloor ? 1 : -1;
            const totalSteps2 = Math.abs(destinationFloor - selectedFloor);
            
            for (let i = 1; i <= totalSteps2; i++) {
              const currentStepFloor = selectedFloor + (step2 * i);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              await fetch(`/api/elevator/${elevatorId}/move`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  targetFloor: currentStepFloor,
                }),
              });
              onUpdate();
            }
            
            message.success(`Ascenseur arrivé à l'étage ${destinationFloor === 0 ? "RDC" : destinationFloor}`);
          }
        }
      }
      
      onUpdate();
    } catch (error) {
      message.error("Erreur lors de l'appel de l'ascenseur");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassenger = async () => {
    if (!newPassengerDestination && newPassengerDestination !== 0) {
      message.warning("Veuillez sélectionner une destination");
      return;
    }

    if (newPassengerDestination === elevator.currentFloor) {
      message.warning("La destination doit être différente de l'étage actuel");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/passenger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elevatorId: elevator.id,
          buildingId: buildingId,
          name: newPassengerName || `Passager ${Date.now()}`,
          currentFloor: elevator.currentFloor,
          destinationFloor: newPassengerDestination,
        }),
      });

      if (!response.ok) {
        message.error("Erreur lors de l'ajout du passager");
        setLoading(false);
        return;
      }

      message.success("Passager ajouté dans l'ascenseur");
      setAddPassengerModalVisible(false);
      setNewPassengerName("");
      setNewPassengerDestination(null);
      
      // Démarrer automatiquement l'ascenseur s'il est idle
      if (elevator.status === "idle") {
        const elevatorResponse = await fetch(`/api/elevator/${elevator.id}`);
        const elevatorData = await elevatorResponse.json();
        if (elevatorData.status === "idle") {
          // Déterminer la direction
          const direction = elevator.currentFloor < newPassengerDestination ? "up" : "down";
          await fetch(`/api/elevator/${elevator.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: elevator.id,
              status: direction === "up" ? "moving_up" : "moving_down",
              direction: direction,
            }),
          });
        }
      }
      
      onUpdate();
    } catch (error) {
      message.error("Erreur lors de l'ajout du passager");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPassengerDestination = async () => {
    if (!editingPassenger || !editDestination && editDestination !== 0) {
      return;
    }

    if (editDestination === elevator.currentFloor) {
      message.warning("La destination doit être différente de l'étage actuel");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/passenger/${editingPassenger.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationFloor: editDestination,
        }),
      });

      if (!response.ok) {
        message.error("Erreur lors de la modification de la destination");
        setLoading(false);
        return;
      }

      message.success("Destination modifiée");
      setEditPassengerModalVisible(false);
      setEditingPassenger(null);
      setEditDestination(null);
      
      // Démarrer automatiquement l'ascenseur s'il est idle
      if (elevator.status === "idle") {
        const elevatorResponse = await fetch(`/api/elevator/${elevator.id}`);
        const elevatorData = await elevatorResponse.json();
        if (elevatorData.status === "idle") {
          // Déterminer la direction
          const direction = elevator.currentFloor < editDestination ? "up" : "down";
          await fetch(`/api/elevator/${elevator.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: elevator.id,
              status: direction === "up" ? "moving_up" : "moving_down",
              direction: direction,
            }),
          });
        }
      }
      
      onUpdate();
    } catch (error) {
      message.error("Erreur lors de la modification de la destination");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    setEditDestination(passenger.destinationFloor);
    setEditPassengerModalVisible(true);
  };

  return (
    <>
      <Card 
        className="shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"
        title={<Title level={4} className="!mb-0 text-white">🎛️ Panneau de contrôle de l'ascenseur</Title>}
      >
        <Space direction="vertical" size="large" className="w-full">
          {/* Panneau de boutons d'étage - Style ascenseur réel */}
          <div className="bg-slate-900 rounded-xl p-6 border-4 border-slate-600 shadow-inner">
            <Text strong className="block mb-4 text-slate-200 text-lg text-center">Boutons d'étage</Text>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalFloors }, (_, i) => {
                const floorNum = totalFloors - 1 - i;
                const isCurrentFloor = floorNum === elevator.currentFloor;
                return (
                  <Button
                    key={floorNum}
                    type={isCurrentFloor ? "primary" : "default"}
                    size="large"
                    onClick={() => handleFloorClick(floorNum)}
                    disabled={loading || elevator.status === "maintenance"}
                    className={`h-14 text-base font-bold transition-all ${
                      isCurrentFloor 
                        ? "bg-blue-600 hover:bg-blue-700 border-2 border-blue-400 shadow-lg shadow-blue-500/50 scale-105 ring-2 ring-blue-300" 
                        : "bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-white hover:scale-105"
                    }`}
                    style={{
                      borderRadius: "8px"
                    }}
                  >
                    {floorNum === 0 ? "RDC" : floorNum}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Bouton d'appel depuis un étage */}
          <div className="pt-4 border-t border-slate-600">
            <Button
              type="primary"
              size="large"
              icon={<PhoneOutlined />}
              onClick={() => setCallModalVisible(true)}
              className="w-full h-16 text-lg font-bold bg-green-600 hover:bg-green-700 border-green-500 shadow-lg"
            >
              📞 Appeler l'ascenseur depuis un étage
            </Button>
          </div>

          {/* Section pour ajouter des passagers */}
          <div className="bg-slate-900 rounded-xl p-4 border-2 border-slate-600">
            <div className="flex justify-between items-center mb-4">
              <Text strong className="text-slate-200 text-base">👥 Passagers</Text>
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => setAddPassengerModalVisible(true)}
                className="bg-purple-600 hover:bg-purple-700 border-purple-500"
              >
                + Ajouter
              </Button>
            </div>
            
            {elevator.passengers && elevator.passengers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {elevator.passengers.map((passenger: Passenger) => (
                  <div key={passenger.id} className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-600 hover:bg-slate-700 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <Text className="text-white font-semibold text-sm">{passenger.name}</Text>
                        <Text className="block text-slate-400 text-xs mt-1">
                          → {passenger.destinationFloor === 0 ? "RDC" : `Étage ${passenger.destinationFloor}`}
                        </Text>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(passenger)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text className="text-slate-500 text-sm text-center block py-4">Aucun passager</Text>
            )}
          </div>
        </Space>
      </Card>

      <Modal
        title={<span className="text-lg">📞 Appeler l'ascenseur</span>}
        open={callModalVisible}
        onOk={handleCallElevator}
        onCancel={() => {
          setCallModalVisible(false);
          setSelectedFloor(null);
          setDestinationFloor(null);
        }}
        confirmLoading={loading}
        okText="Confirmer l'appel"
        cancelText="Annuler"
        okButtonProps={{ className: "bg-blue-600" }}
      >
        <Space direction="vertical" size="large" className="w-full pt-4">
          <div>
            <Text strong className="block mb-2">Depuis quel étage appelez-vous ?</Text>
            <InputNumber
              min={0}
              max={totalFloors - 1}
              value={selectedFloor}
              onChange={(value) => setSelectedFloor(value)}
              placeholder="Sélectionner l'étage de départ"
              className="w-full"
              size="large"
              formatter={(value) => value === 0 ? "RDC" : String(value)}
              parser={(value) => (value === "RDC" ? 0 : Number(value))}
            />
          </div>
          <div>
            <Text strong className="block mb-2">Vers quel étage souhaitez-vous aller ?</Text>
            <InputNumber
              min={0}
              max={totalFloors - 1}
              value={destinationFloor}
              onChange={(value) => setDestinationFloor(value)}
              placeholder="Sélectionner l'étage de destination"
              className="w-full"
              size="large"
              formatter={(value) => value === 0 ? "RDC" : String(value)}
              parser={(value) => (value === "RDC" ? 0 : Number(value))}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal pour ajouter un passager */}
      <Modal
        title={<span className="text-lg">👥 Ajouter un passager</span>}
        open={addPassengerModalVisible}
        onOk={handleAddPassenger}
        onCancel={() => {
          setAddPassengerModalVisible(false);
          setNewPassengerName("");
          setNewPassengerDestination(null);
        }}
        confirmLoading={loading}
        okText="Ajouter"
        cancelText="Annuler"
        okButtonProps={{ className: "bg-purple-600" }}
      >
        <Space direction="vertical" size="large" className="w-full pt-4">
          <div>
            <Text strong className="block mb-2">Nom du passager (optionnel)</Text>
            <Input
              value={newPassengerName}
              onChange={(e) => setNewPassengerName(e.target.value)}
              placeholder="Nom du passager"
              size="large"
            />
          </div>
          <div>
            <Text strong className="block mb-2">Destination</Text>
            <InputNumber
              min={0}
              max={totalFloors - 1}
              value={newPassengerDestination}
              onChange={(value) => setNewPassengerDestination(value)}
              placeholder="Sélectionner l'étage de destination"
              className="w-full"
              size="large"
              formatter={(value) => value === 0 ? "RDC" : String(value)}
              parser={(value) => (value === "RDC" ? 0 : Number(value))}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal pour modifier la destination d'un passager */}
      <Modal
        title={<span className="text-lg">✏️ Modifier la destination</span>}
        open={editPassengerModalVisible}
        onOk={handleEditPassengerDestination}
        onCancel={() => {
          setEditPassengerModalVisible(false);
          setEditingPassenger(null);
          setEditDestination(null);
        }}
        confirmLoading={loading}
        okText="Modifier"
        cancelText="Annuler"
        okButtonProps={{ className: "bg-blue-600" }}
      >
        <Space direction="vertical" size="large" className="w-full pt-4">
          {editingPassenger && (
            <>
              <div>
                <Text strong className="block mb-2">Passager</Text>
                <Text>{editingPassenger.name}</Text>
              </div>
              <div>
                <Text strong className="block mb-2">Nouvelle destination</Text>
                <InputNumber
                  min={0}
                  max={totalFloors - 1}
                  value={editDestination}
                  onChange={(value) => setEditDestination(value)}
                  placeholder="Sélectionner l'étage de destination"
                  className="w-full"
                  size="large"
                  formatter={(value) => value === 0 ? "RDC" : String(value)}
                  parser={(value) => (value === "RDC" ? 0 : Number(value))}
                />
              </div>
            </>
          )}
        </Space>
      </Modal>
    </>
  );
}

