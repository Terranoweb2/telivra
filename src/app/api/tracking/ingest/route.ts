import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { positionSchema } from "@/lib/validators";
import { isPointInGeofence } from "@/lib/geofence-utils";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { serialNumber, latitude, longitude, altitude, speed, heading, accuracy } = parsed.data;

  const device = await prisma.device.findUnique({ where: { serialNumber } });
  if (!device) return NextResponse.json({ error: "Appareil inconnu" }, { status: 404 });

  // Trouver un trip en cours pour ce device
  const activeTrip = await prisma.trip.findFirst({
    where: { deviceId: device.id, status: "IN_PROGRESS" },
  });

  // Creer la position
  const position = await prisma.position.create({
    data: {
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      accuracy,
      deviceId: device.id,
      tripId: activeTrip?.id,
    },
  });

  // Mettre a jour le device
  await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSeen: new Date(),
      status: "ACTIVE",
      batteryLevel: body.batteryLevel ?? undefined,
    },
  });

  // Mettre a jour les stats du trip si actif
  if (activeTrip) {
    const positions = await prisma.position.findMany({
      where: { tripId: activeTrip.id },
      orderBy: { timestamp: "asc" },
    });

    if (positions.length >= 2) {
      let totalDist = 0;
      let maxSpeed = 0;
      let totalSpeed = 0;
      let speedCount = 0;

      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        totalDist += haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
        if (curr.speed != null) {
          if (curr.speed > maxSpeed) maxSpeed = curr.speed;
          totalSpeed += curr.speed;
          speedCount++;
        }
      }

      const durationMs = new Date(positions[positions.length - 1].timestamp).getTime() - new Date(positions[0].timestamp).getTime();

      await prisma.trip.update({
        where: { id: activeTrip.id },
        data: {
          distanceKm: Math.round(totalDist * 100) / 100,
          durationMinutes: Math.round(durationMs / 60000),
          maxSpeedKmh: maxSpeed,
          avgSpeedKmh: speedCount > 0 ? Math.round((totalSpeed / speedCount) * 100) / 100 : 0,
        },
      });
    }
  }

  // === DETECTION GEOFENCE ===
  try {
    const geofences = await prisma.geofence.findMany({ where: { isActive: true } });

    // Recuperer la position precedente pour detecter entree/sortie
    const prevPositions = await prisma.position.findMany({
      where: { deviceId: device.id, id: { not: position.id } },
      orderBy: { timestamp: "desc" },
      take: 1,
    });

    const prevPos = prevPositions[0];

    for (const geofence of geofences) {
      const isInside = isPointInGeofence(latitude, longitude, geofence);
      const wasInside = prevPos ? isPointInGeofence(prevPos.latitude, prevPos.longitude, geofence) : false;

      if (isInside && !wasInside) {
        // Entree dans la geofence
        await prisma.alert.create({
          data: {
            type: "GEOFENCE_ENTER",
            severity: "WARNING",
            title: `${device.name} entre dans ${geofence.name}`,
            message: `L'appareil ${device.name} est entré dans la zone ${geofence.name} a ${new Date().toLocaleTimeString("fr-FR")}`,
            deviceId: device.id,
            geofenceId: geofence.id,
            userId: device.userId,
          },
        });
      } else if (!isInside && wasInside) {
        // Sortie de la geofence
        await prisma.alert.create({
          data: {
            type: "GEOFENCE_EXIT",
            severity: "WARNING",
            title: `${device.name} sort de ${geofence.name}`,
            message: `L'appareil ${device.name} a quitté la zone ${geofence.name} a ${new Date().toLocaleTimeString("fr-FR")}`,
            deviceId: device.id,
            geofenceId: geofence.id,
            userId: device.userId,
          },
        });
      }
    }
  } catch (e) {
    console.error("Erreur detection geofence:", e);
  }

  // Emettre via Socket.IO
  const io = (global as any).io;
  if (io) {
    const payload = {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      latitude,
      longitude,
      speed,
      heading,
      batteryLevel: body.batteryLevel ?? device.batteryLevel,
      timestamp: position.timestamp,
    };
    io.to(`device:${device.id}`).emit("position:update", payload);
    io.to("all-devices").emit("position:update", payload);
  }

  return NextResponse.json({ success: true, positionId: position.id });
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
