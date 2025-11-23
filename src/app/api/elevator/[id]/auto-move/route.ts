import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Déplacer automatiquement l'ascenseur vers la prochaine destination
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const elevator = await prisma.elevator.findUnique({
      where: { id },
      include: {
        passengers: {
          where: {
            status: "in_elevator",
          },
        },
      },
    });

    if (!elevator) {
      return NextResponse.json(
        { error: "Elevator not found" },
        { status: 404 }
      );
    }

    // Trouver la prochaine destination
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

    let nextFloor: number | null = null;
    let nextDirection: "up" | "down" | null = null;

    // Priorité 1: Aller chercher les passagers qui attendent
    if (remainingRequests) {
      // Si on est déjà à l'étage de départ, aller à la destination
      if (elevator.currentFloor === remainingRequests.fromFloor) {
        nextFloor = remainingRequests.toFloor;
      } else {
        // Sinon, aller chercher le passager d'abord
        nextFloor = remainingRequests.fromFloor;
      }
      nextDirection = elevator.currentFloor < nextFloor ? "up" : "down";
    }

    // Priorité 2: Déposer les passagers dans l'ascenseur
    if (elevator.passengers.length > 0) {
      const destinations = elevator.passengers.map(p => p.destinationFloor);
      
      if (elevator.direction === "up") {
        const goingUp = destinations.filter(d => d > elevator.currentFloor);
        if (goingUp.length > 0) {
          const closest = Math.min(...goingUp);
          if (!nextFloor || closest < nextFloor) {
            nextFloor = closest;
            nextDirection = "up";
          }
        }
      } else if (elevator.direction === "down") {
        const goingDown = destinations.filter(d => d <= elevator.currentFloor);
        if (goingDown.length > 0) {
          const closest = Math.max(...goingDown);
          if (!nextFloor || closest > nextFloor) {
            nextFloor = closest;
            nextDirection = "down";
          }
        }
      } else {
        // Pas de direction, choisir la destination la plus proche
        const closest = destinations.reduce((closest, current) => 
          Math.abs(current - elevator.currentFloor) < Math.abs(closest - elevator.currentFloor) 
            ? current : closest
        );
        if (!nextFloor || Math.abs(closest - elevator.currentFloor) < Math.abs(nextFloor - elevator.currentFloor)) {
          nextFloor = closest;
          nextDirection = elevator.currentFloor < closest ? "up" : "down";
        }
      }
    }

    // Vérifier s'il y a des passagers à destination à l'étage actuel
    const passengersAtCurrentFloor = await prisma.passenger.findFirst({
      where: {
        elevatorId: id,
        destinationFloor: elevator.currentFloor,
        status: "in_elevator",
      },
    });

    // Si des passagers doivent sortir à l'étage actuel, ne pas bouger
    if (passengersAtCurrentFloor) {
      return NextResponse.json({ 
        moved: false, 
        message: "Passengers exiting at current floor",
        currentFloor: elevator.currentFloor 
      });
    }

    if (!nextFloor || nextFloor === elevator.currentFloor) {
      // Plus de destinations, mettre en idle
      await prisma.elevator.update({
        where: { id },
        data: {
          status: "idle",
          direction: null,
        },
      });
      return NextResponse.json({ moved: false, message: "No destination" });
    }

    // Déplacer d'un étage à la fois
    const step = elevator.currentFloor < nextFloor ? 1 : -1;
    const newFloor = elevator.currentFloor + step;

    // Mettre à jour directement l'ascenseur
    const moveDirection = elevator.currentFloor < newFloor ? "up" : "down";
    const newStatus = moveDirection === "up" ? "moving_up" : "moving_down";

    const updatedElevator = await prisma.elevator.update({
      where: { id },
      data: {
        currentFloor: newFloor,
        status: newStatus,
        direction: moveDirection,
      },
    });

    // Mettre à jour le currentFloor des passagers dans l'ascenseur
    await prisma.passenger.updateMany({
      where: {
        elevatorId: id,
        status: "in_elevator",
      },
      data: {
        currentFloor: newFloor,
      },
    });

    // Faire sortir UN SEUL passager à la fois qui arrive à sa destination
    const passengersToExit = await prisma.passenger.findFirst({
      where: {
        elevatorId: id,
        destinationFloor: newFloor,
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
          elevatorId: null,
        },
      });
    }

    // Faire entrer les passagers qui attendent à cet étage
    const waitingPassengers = await prisma.passenger.findMany({
      where: {
        currentFloor: newFloor,
        status: "waiting",
        request: {
          elevatorId: id,
          status: {
            in: ["assigned", "in_progress"],
          },
        },
      },
    });

    for (const passenger of waitingPassengers) {
      await prisma.passenger.update({
        where: { id: passenger.id },
        data: {
          status: "in_elevator",
          elevatorId: id,
          currentFloor: newFloor,
          enteredAt: new Date(),
        },
      });

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
        toFloor: newFloor,
        status: {
          in: ["assigned", "in_progress"],
        },
      },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ moved: true, currentFloor: newFloor, direction: moveDirection });
  } catch (error) {
    console.error("Error in auto-move:", error);
    return NextResponse.json(
      { error: "Failed to auto-move elevator" },
      { status: 500 }
    );
  }
}

