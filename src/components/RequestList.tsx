"use client";

import { useEffect, useState } from "react";
import { Card, List, Tag, Typography, Empty, Button, Space, message } from "antd";
import { 
  UpOutlined, 
  DownOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined 
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Request {
  id: string;
  buildingId?: string;
  fromFloor: number;
  toFloor: number;
  status: string;
  createdAt: string;
  elevator?: {
    name: string;
  };
}

interface RequestListProps {
  buildingId: string;
}

export default function RequestList({ buildingId }: RequestListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/request");
      const data = await response.json();
      // Filtrer les demandes pour ce bâtiment
      const buildingRequests = data.filter(
        (req: any) => req.buildingId === buildingId
      );
      setRequests(buildingRequests.slice(0, 10)); // Limiter à 10 dernières
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Suppression de l'actualisation automatique - seulement au chargement initial
  }, [buildingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "assigned":
        return "processing";
      case "in_progress":
        return "processing";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "assigned":
        return "Assigné";
      case "in_progress":
        return "En cours";
      case "completed":
        return "Terminé";
      case "cancelled":
        return "Annulé";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card 
      className="shadow-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-slate-700/50 backdrop-blur-sm"
      title={
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-xl">📋</span>
            </div>
            <Title level={4} className="!mb-0 text-white font-semibold">Demandes récentes</Title>
          </div>
          <Button 
            size="small" 
            onClick={fetchRequests}
            loading={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border-0 shadow-md shadow-blue-500/30 text-white font-medium"
          >
            Actualiser
          </Button>
        </div>
      }
    >
      {requests.length === 0 ? (
        <Empty 
          description={<span className="text-slate-400">Aucune demande en cours</span>}
          className="my-8"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={requests}
          loading={loading}
          className="[&_.ant-list-item]:border-0 [&_.ant-list-item]:px-0"
          renderItem={(request: Request) => {
            const isGoingUp = request.toFloor > request.fromFloor;
            return (
              <List.Item className="bg-gradient-to-r from-slate-700/50 to-slate-700/30 rounded-lg mb-3 px-4 py-3 hover:from-slate-600/50 hover:to-slate-600/30 transition-all border border-slate-600/50 shadow-sm">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-3">
                    <Space size="small" wrap>
                      <Tag 
                        color={getStatusColor(request.status)}
                        className="font-medium border-0"
                      >
                        {getStatusText(request.status)}
                      </Tag>
                      {request.elevator && (
                        <Tag 
                          color="blue"
                          className="font-medium border-0 bg-blue-500/20 text-blue-300"
                        >
                          {request.elevator.name}
                        </Tag>
                      )}
                    </Space>
                    <Text className="text-xs text-slate-400 font-medium">
                      {formatDate(request.createdAt)}
                    </Text>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg font-bold text-lg shadow-md ${
                      isGoingUp 
                        ? "bg-gradient-to-r from-green-600 to-green-500 text-white" 
                        : "bg-gradient-to-r from-orange-600 to-orange-500 text-white"
                    }`}>
                      {request.fromFloor === 0 ? "RDC" : request.fromFloor}
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isGoingUp 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-orange-500/20 text-orange-400"
                    }`}>
                      {isGoingUp ? (
                        <UpOutlined className="text-lg" />
                      ) : (
                        <DownOutlined className="text-lg" />
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-lg shadow-md ${
                      isGoingUp 
                        ? "bg-gradient-to-r from-green-600 to-green-500 text-white" 
                        : "bg-gradient-to-r from-orange-600 to-orange-500 text-white"
                    }`}>
                      {request.toFloor === 0 ? "RDC" : request.toFloor}
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}

