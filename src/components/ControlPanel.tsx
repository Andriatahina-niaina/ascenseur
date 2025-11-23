"use client";

import { useState } from "react";
import { Card, Space, Typography, Button, message, Modal, InputNumber } from "antd";
import { PhoneOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface ControlPanelProps {
  elevator: {
    id: string;
    name: string;
    currentFloor: number;
    status: string;
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

  const handleFloorClick = async (floor: number) => {
    if (floor === elevator.currentFloor) {
      message.info("Vous êtes déjà à cet étage");
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

      message.success(`Ascenseur en route vers l'étage ${floor === 0 ? "RDC" : floor}`);
      
      // Simuler le mouvement de l'ascenseur étape par étape
      const startFloor = elevator.currentFloor;
      const endFloor = floor;
      const step = startFloor < endFloor ? 1 : -1;
      const totalSteps = Math.abs(endFloor - startFloor);
      
      // Déplacer l'ascenseur progressivement
      for (let i = 1; i <= totalSteps; i++) {
        const currentStepFloor = startFloor + (step * i);
        
        // Attendre un peu avant chaque mouvement (simulation)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mettre à jour l'ascenseur
        const moveResponse = await fetch(`/api/elevator/${elevator.id}/move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetFloor: currentStepFloor,
          }),
        });

        if (moveResponse.ok) {
          // Rafraîchir les données
          onUpdate();
        }
      }
      
      // Dernière mise à jour pour s'assurer que l'ascenseur est à l'étage final
      await fetch(`/api/elevator/${elevator.id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetFloor: endFloor,
        }),
      });
      
      message.success(`Ascenseur arrivé à l'étage ${floor === 0 ? "RDC" : floor}`);
      onUpdate();
    } catch (error) {
      message.error("Erreur lors du déplacement de l'ascenseur");
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

  return (
    <>
      <Card 
        className="shadow-2xl bg-slate-800 border-slate-700"
        title={<Title level={4} className="!mb-0 text-white">Panneau de contrôle</Title>}
      >
        <Space direction="vertical" size="large" className="w-full">
          {/* Boutons à l'intérieur de l'ascenseur */}
          <div>
            <Text strong className="block mb-4 text-slate-300 text-lg">🚪 Sélectionner l'étage (depuis l'ascenseur)</Text>
            <div className="grid grid-cols-5 gap-3">
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
                    className={`h-16 text-lg font-bold ${
                      isCurrentFloor 
                        ? "bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-lg shadow-blue-500/50" 
                        : "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                    }`}
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
    </>
  );
}

