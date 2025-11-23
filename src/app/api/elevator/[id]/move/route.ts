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

    // Mettre à jour le currentFloor des passagers dans l'ascenseur
    await prisma.passenger.updateMany({
      where: {
        elevatorId: id,
        status: "in_elevator",
      },
      data: {
        currentFloor: targetFloor,
      },
    });

    // Faire sortir UN SEUL passager à la fois qui arrive à sa destination
    const passengersToExit = await prisma.passenger.findFirst({
      where: {
        elevatorId: id,
        destinationFloor: targetFloor,
        status: "in_elevator",
      },
      orderBy: {
        enteredAt: "asc", // Le premier entré sort en premier
      },
    });

    if (passengersToExit) {
      await prisma.passenger.update({
        where: { id: passengersToExit.id },
        data: {
          status: "completed",
          exitedAt: new Date(),
          elevatorId: null, // Le passager n'est plus dans l'ascenseur
        },
      });
    }

    // Faire entrer les passagers qui attendent à cet étage et qui ont une demande assignée à cet ascenseur
    const waitingPassengers = await prisma.passenger.findMany({
      where: {
        currentFloor: targetFloor,
        status: "waiting",
        request: {
          elevatorId: id,
          status: {
            in: ["assigned", "in_progress"],
          },
        },
      },
      include: {
        request: true,
      },
    });

    for (const passenger of waitingPassengers) {
      await prisma.passenger.update({
        where: { id: passenger.id },
        data: {
          status: "in_elevator",
          elevatorId: id,
          currentFloor: targetFloor, // Mettre à jour l'étage actuel du passager
          enteredAt: new Date(),
        },
      });

      // Mettre à jour le statut de la demande
      await prisma.request.update({
        where: { id: passenger.requestId },
        data: {
          status: "in_progress",
        },
      });
    }

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

    // Vérifier s'il y a d'autres demandes en attente ou des passagers avec des destinations
    const remainingRequests = await prisma.request.findFirst({
      where: {
        elevatorId: id,
        status: {
          in: ["pending", "assigned", "in_progress"],
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    });

    // Vérifier s'il y a des passagers dans l'ascenseur avec des destinations
    const passengersInElevator = await prisma.passenger.findMany({
      where: {
        elevatorId: id,
        status: "in_elevator",
      },
      orderBy: {
        destinationFloor: "asc",
      },
    });

    // Trouver la prochaine destination (soit d'une demande, soit d'un passager)
    let nextDestination: number | null = null;
    let nextDirection: "up" | "down" | null = null;

    if (remainingRequests) {
      nextDestination = remainingRequests.toFloor;
      nextDirection = updatedElevator.currentFloor < remainingRequests.toFloor ? "up" : "down";
    }

    // Vérifier aussi les destinations des passagers dans l'ascenseur
    if (passengersInElevator.length > 0) {
      // Trouver la destination la plus proche dans la direction actuelle
      const goingUp = passengersInElevator.filter(p => p.destinationFloor > updatedElevator.currentFloor);
      const goingDown = passengersInElevator.filter(p => p.destinationFloor < updatedElevator.currentFloor);

      if (elevator.direction === "up" && goingUp.length > 0) {
        const closestUp = goingUp.reduce((closest, current) => 
          current.destinationFloor < closest.destinationFloor ? current : closest
        );
        if (!nextDestination || closestUp.destinationFloor < nextDestination) {
          nextDestination = closestUp.destinationFloor;
          nextDirection = "up";
        }
      } else if (elevator.direction === "down" && goingDown.length > 0) {
        const closestDown = goingDown.reduce((closest, current) => 
          current.destinationFloor > closest.destinationFloor ? current : closest
        );
        if (!nextDestination || closestDown.destinationFloor > nextDestination) {
          nextDestination = closestDown.destinationFloor;
          nextDirection = "down";
        }
      } else if (!nextDestination) {
        // Si pas de direction actuelle, choisir la destination la plus proche
        const allDestinations = passengersInElevator.map(p => p.destinationFloor);
        const closest = allDestinations.reduce((closest, current) => 
          Math.abs(current - updatedElevator.currentFloor) < Math.abs(closest - updatedElevator.currentFloor) 
            ? current : closest
        );
        nextDestination = closest;
        nextDirection = updatedElevator.currentFloor < closest ? "up" : "down";
      }
    }

    if (!nextDestination && newStatus !== "idle") {
      // Plus de demandes ni de passagers, mettre l'ascenseur en idle
      await prisma.elevator.update({
        where: { id },
        data: {
          status: "idle",
          direction: null,
        },
      });
    } else if (nextDestination && nextDirection) {
      // Mettre à jour la direction selon la prochaine destination
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

