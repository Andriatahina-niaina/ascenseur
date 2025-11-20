import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Simuler le mouvement de l'ascenseur vers un étage
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { targetFloor } = body;

    const elevator = await prisma.elevator.findUnique({
      where: { id },
    });

    if (!elevator) {
      return NextResponse.json(
        { error: "Elevator not found" },
        { status: 404 }
      );
    }

    // Mettre à jour l'étage actuel de l'ascenseur
    const direction = elevator.currentFloor < targetFloor ? "up" : "down";
    const newStatus = elevator.currentFloor === targetFloor ? "idle" : (direction === "up" ? "moving_up" : "moving_down");

    const updatedElevator = await prisma.elevator.update({
      where: { id },
      data: {
        currentFloor: targetFloor,
        status: newStatus,
        direction: elevator.currentFloor === targetFloor ? null : direction,
      },
    });

    // Marquer les demandes complétées pour cet étage
    await prisma.request.updateMany({
      where: {
        elevatorId: id,
        toFloor: targetFloor,
        status: {
          in: ["assigned", "in_progress"],
        },
      },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // Vérifier s'il y a d'autres demandes en attente
    const remainingRequests = await prisma.request.findFirst({
      where: {
        elevatorId: id,
        status: {
          in: ["pending", "assigned", "in_progress"],
        },
      },
      orderBy: {
        priority: "desc",
        createdAt: "asc",
      },
    });

    if (!remainingRequests && newStatus !== "idle") {
      // Plus de demandes, mettre l'ascenseur en idle
      await prisma.elevator.update({
        where: { id },
        data: {
          status: "idle",
          direction: null,
        },
      });
    } else if (remainingRequests) {
      // Mettre à jour la direction selon la prochaine demande
      const nextDirection = updatedElevator.currentFloor < remainingRequests.fromFloor ? "up" : "down";
      await prisma.elevator.update({
        where: { id },
        data: {
          status: nextDirection === "up" ? "moving_up" : "moving_down",
          direction: nextDirection,
        },
      });
    }

    const finalElevator = await prisma.elevator.findUnique({
      where: { id },
    });

    return NextResponse.json(finalElevator);
  } catch (error) {
    console.error("Error moving elevator:", error);
    return NextResponse.json(
      { error: "Failed to move elevator" },
      { status: 500 }
    );
  }
}

