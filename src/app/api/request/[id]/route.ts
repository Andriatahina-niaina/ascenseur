import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT - Mettre à jour une demande
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, elevatorId } = body;
    
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status,
        elevatorId,
        completedAt: status === "completed" ? new Date() : undefined,
      },
      include: {
        building: true,
        elevator: true,
      },
    });
    
    // Si la demande est complétée, vérifier s'il y a d'autres demandes pour l'ascenseur
    if (status === "completed" && updatedRequest.elevatorId) {
      const remainingRequests = await prisma.request.findFirst({
        where: {
          elevatorId: updatedRequest.elevatorId,
          status: {
            in: ["pending", "assigned", "in_progress"],
          },
        },
        orderBy: {
          priority: "desc",
        },
      });
      
      if (!remainingRequests) {
        // Plus de demandes, mettre l'ascenseur en idle
        await prisma.elevator.update({
          where: { id: updatedRequest.elevatorId },
          data: {
            status: "idle",
            direction: null,
          },
        });
      } else {
        // Mettre à jour la direction de l'ascenseur selon la prochaine demande
        const elevator = await prisma.elevator.findUnique({
          where: { id: updatedRequest.elevatorId },
        });
        
        if (elevator) {
          const nextFloor = remainingRequests.fromFloor;
          const direction = elevator.currentFloor < nextFloor ? "up" : "down";
          await prisma.elevator.update({
            where: { id: updatedRequest.elevatorId },
            data: {
              status: direction === "up" ? "moving_up" : "moving_down",
              direction,
            },
          });
        }
      }
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une demande
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.request.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}

