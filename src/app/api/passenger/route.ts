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

