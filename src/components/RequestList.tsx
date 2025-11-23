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
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, []);

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
      className="shadow-2xl sticky top-4 bg-slate-800 border-slate-700"
      title={
        <Space>
          <Title level={4} className="!mb-0 text-white">📋 Demandes récentes</Title>
          <Button 
            size="small" 
            onClick={fetchRequests}
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
          >
            Actualiser
          </Button>
        </Space>
      }
    >
      {requests.length === 0 ? (
        <Empty 
          description={<span className="text-slate-400">Aucune demande en cours</span>}
          className="my-8"
        />
      ) : (
        <List
          dataSource={requests}
          loading={loading}
          renderItem={(request: Request) => {
            const isGoingUp = request.toFloor > request.fromFloor;
            return (
              <List.Item className="bg-slate-700 rounded-lg mb-2 px-4 hover:bg-slate-600 transition-colors">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <Space>
                      <Tag color={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </Tag>
                      {request.elevator && (
                        <Tag color="blue">{request.elevator.name}</Tag>
                      )}
                    </Space>
                    <Text className="text-xs text-slate-400">
                      {formatDate(request.createdAt)}
                    </Text>
                  </div>
                  <div className="flex items-center gap-3 text-lg">
                    <div className={`px-3 py-1 rounded font-bold ${
                      isGoingUp ? "bg-green-900 text-green-300" : "bg-orange-900 text-orange-300"
                    }`}>
                      {request.fromFloor === 0 ? "RDC" : request.fromFloor}
                    </div>
                    {isGoingUp ? (
                      <UpOutlined className="text-green-400 text-xl" />
                    ) : (
                      <DownOutlined className="text-orange-400 text-xl" />
                    )}
                    <div className={`px-3 py-1 rounded font-bold ${
                      isGoingUp ? "bg-green-900 text-green-300" : "bg-orange-900 text-orange-300"
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

