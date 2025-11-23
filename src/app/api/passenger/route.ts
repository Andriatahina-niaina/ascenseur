import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Récupérer tous les passagers (en attente, dans l'ascenseur, etc.)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get("buildingId");
    const status = searchParams.get("status");

    const where: any = {};
    if (buildingId) {
      where.request = {
        buildingId,
      };
    }
    if (status) {
      where.status = status;
    } else {
      // Par défaut, récupérer les passagers en attente et dans l'ascenseur
      where.status = {
        in: ["waiting", "in_elevator"],
      };
    }

    const passengers = await prisma.passenger.findMany({
      where,
      include: {
        request: {
          include: {
            elevator: true,
          },
        },
        elevator: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(passengers);
  } catch (error) {
    console.error("Error fetching passengers:", error);
    return NextResponse.json(
      { error: "Failed to fetch passengers" },
      { status: 500 }
    );
  }
}

// POST - Créer un passager directement dans l'ascenseur
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { elevatorId, buildingId, name, currentFloor, destinationFloor } = body;

    if (!elevatorId || !buildingId || currentFloor === undefined || destinationFloor === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: elevatorId, buildingId, currentFloor, destinationFloor" },
        { status: 400 }
      );
    }

    // Vérifier que l'ascenseur existe
    const elevator = await prisma.elevator.findUnique({
      where: { id: elevatorId },
    });

    if (!elevator) {
      return NextResponse.json(
        { error: "Elevator not found" },
        { status: 404 }
      );
    }

    // Créer une demande associée
    const newRequest = await prisma.request.create({
      data: {
        buildingId,
        elevatorId,
        fromFloor: currentFloor,
        toFloor: destinationFloor,
        status: "in_progress",
        priority: 0,
      },
    });

    // Créer le passager directement dans l'ascenseur
    const passenger = await prisma.passenger.create({
      data: {
        requestId: newRequest.id,
        elevatorId,
        name: name || `Passager ${Date.now()}`,
        currentFloor: currentFloor,
        destinationFloor: destinationFloor,
        status: "in_elevator",
        enteredAt: new Date(),
      },
      include: {
        request: true,
        elevator: true,
      },
    });

    return NextResponse.json(passenger);
  } catch (error) {
    console.error("Error creating passenger:", error);
    return NextResponse.json(
      { error: "Failed to create passenger" },
      { status: 500 }
    );
  }
}

