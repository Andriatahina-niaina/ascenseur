import { NextResponse } from "next/server";
import { prisma, formatConnectionError } from "@/lib/prisma";

// GET - Récupérer le bâtiment (ou créer s'il n'existe pas)
export async function GET() {
  try {
    let building = await prisma.building.findFirst();
    
    if (!building) {
      // Créer un bâtiment par défaut avec 10 étages
      building = await prisma.building.create({
        data: {
          name: "Résidence Dakard",
          totalFloors: 10,
        },
        include: {
          elevators: true,
        },
      });
      
      // Créer un ascenseur par défaut
      await prisma.elevator.create({
        data: {
          buildingId: building.id,
          name: "Ascenseur Principal",
          currentFloor: 0,
          status: "idle",
        },
      });
    } else {
      building = await prisma.building.findFirst({
        include: {
          elevators: {
            include: {
              passengers: {
                where: {
                  status: "in_elevator",
                },
              },
              _count: {
                select: {
                  requests: {
                    where: {
                      status: {
                        in: ["pending", "assigned", "in_progress"],
                      },
                    },
                  },
                  passengers: {
                    where: {
                      status: "in_elevator",
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
    
    return NextResponse.json(building);
  } catch (error: any) {
    console.error("Error fetching building:", error);
    const errorMessage = formatConnectionError(error);
    return NextResponse.json(
      { 
        error: "Failed to fetch building",
        details: errorMessage,
        rawError: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le bâtiment
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, totalFloors } = body;
    
    let building = await prisma.building.findFirst();
    
    if (!building) {
      building = await prisma.building.create({
        data: {
          name: name || "Résidence Dakard",
          totalFloors: totalFloors || 10,
        },
      });
    } else {
      building = await prisma.building.update({
        where: { id: building.id },
        data: {
          name,
          totalFloors,
        },
      });
    }
    
    return NextResponse.json(building);
  } catch (error: any) {
    console.error("Error updating building:", error);
    const errorMessage = formatConnectionError(error);
    return NextResponse.json(
      { 
        error: "Failed to update building",
        details: errorMessage,
        rawError: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

