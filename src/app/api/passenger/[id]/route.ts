import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT - Mettre à jour la destination d'un passager
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { destinationFloor } = body;

    if (destinationFloor === undefined) {
      return NextResponse.json(
        { error: "Missing destinationFloor" },
        { status: 400 }
      );
    }

    const passenger = await prisma.passenger.findUnique({
      where: { id },
      include: {
        request: true,
      },
    });

    if (!passenger) {
      return NextResponse.json(
        { error: "Passenger not found" },
        { status: 404 }
      );
    }

    // Mettre à jour la destination du passager
    const updatedPassenger = await prisma.passenger.update({
      where: { id },
      data: {
        destinationFloor,
      },
      include: {
        request: {
          include: {
            elevator: true,
          },
        },
        elevator: true,
      },
    });

    // Mettre à jour aussi la demande associée
    if (passenger.requestId) {
      await prisma.request.update({
        where: { id: passenger.requestId },
        data: {
          toFloor: destinationFloor,
        },
      });
    }

    return NextResponse.json(updatedPassenger);
  } catch (error) {
    console.error("Error updating passenger:", error);
    return NextResponse.json(
      { error: "Failed to update passenger" },
      { status: 500 }
    );
  }
}

