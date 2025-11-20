import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Récupérer tous les ascenseurs
export async function GET() {
  try {
    const elevators = await prisma.elevator.findMany({
      include: {
        building: true,
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
      orderBy: {
        name: "asc",
      },
    });
    
    return NextResponse.json(elevators);
  } catch (error) {
    console.error("Error fetching elevators:", error);
    return NextResponse.json(
      { error: "Failed to fetch elevators" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour l'état d'un ascenseur
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, currentFloor, status, direction } = body;
    
    const elevator = await prisma.elevator.update({
      where: { id },
      data: {
        currentFloor,
        status,
        direction,
      },
    });
    
    return NextResponse.json(elevator);
  } catch (error) {
    console.error("Error updating elevator:", error);
    return NextResponse.json(
      { error: "Failed to update elevator" },
      { status: 500 }
    );
  }
}

