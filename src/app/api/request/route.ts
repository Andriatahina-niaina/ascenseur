import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Récupérer toutes les demandes
export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      include: {
        building: true,
        elevator: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limiter à 50 dernières demandes
    });
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle demande
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buildingId, fromFloor, toFloor, priority, notes } = body;
    
    // Trouver un ascenseur disponible ou le plus proche
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        elevators: {
          include: {
            _count: {
              select: {
                requests: {
                  where: {
                    status: {
                      in: ["pending", "assigned", "in_progress"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!building) {
      return NextResponse.json(
        { error: "Building not found" },
        { status: 404 }
      );
    }
    
    // Créer la demande
    const newRequest = await prisma.request.create({
      data: {
        buildingId,
        fromFloor,
        toFloor,
        priority: priority || 0,
        notes,
        status: "pending",
      },
    });
    
    // Logique simple d'assignation : trouver l'ascenseur le plus proche disponible
    if (building.elevators.length > 0) {
      const availableElevators = building.elevators.filter(
        (e) => e.status === "idle" || e.status === "moving_up" || e.status === "moving_down"
      );
      
      if (availableElevators.length > 0) {
        // Trouver l'ascenseur le plus proche de l'étage de départ
        const closestElevator = availableElevators.reduce((closest, current) => {
          const closestDistance = Math.abs(closest.currentFloor - fromFloor);
          const currentDistance = Math.abs(current.currentFloor - fromFloor);
          return currentDistance < closestDistance ? current : closest;
        });
        
        // Assigner la demande à l'ascenseur
        await prisma.request.update({
          where: { id: newRequest.id },
          data: {
            elevatorId: closestElevator.id,
            status: "assigned",
          },
        });
        
        // Mettre à jour le statut de l'ascenseur
        const direction = closestElevator.currentFloor < fromFloor ? "up" : "down";
        await prisma.elevator.update({
          where: { id: closestElevator.id },
          data: {
            status: direction === "up" ? "moving_up" : "moving_down",
            direction,
          },
        });
      }
    }
    
    const updatedRequest = await prisma.request.findUnique({
      where: { id: newRequest.id },
      include: {
        building: true,
        elevator: true,
      },
    });
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}

