import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const [
    totalDevices,
    activeDevices,
    totalTrips,
    activeTrips,
    totalAlerts,
    unreadAlerts,
    totalGeofences,
    totalPositions,
    recentTrips,
    devicesByType,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: "ACTIVE" } }),
    prisma.trip.count(),
    prisma.trip.count({ where: { status: "IN_PROGRESS" } }),
    prisma.alert.count({ where: { userId: (session.user as any).id } }),
    prisma.alert.count({ where: { userId: (session.user as any).id, isRead: false } }),
    prisma.geofence.count({ where: { isActive: true } }),
    prisma.position.count(),
    prisma.trip.findMany({
      orderBy: { startTime: "desc" },
      take: 10,
      include: { device: { select: { name: true, type: true } } },
    }),
    prisma.device.groupBy({ by: ["type"], _count: true }),
  ]);

  // Stats des trips completes
  const completedTrips = await prisma.trip.findMany({
    where: { status: "COMPLETED" },
    select: { distanceKm: true, durationMinutes: true, avgSpeedKmh: true, maxSpeedKmh: true },
  });

  const totalDistanceKm = completedTrips.reduce((sum, t) => sum + t.distanceKm, 0);
  const totalDurationMin = completedTrips.reduce((sum, t) => sum + t.durationMinutes, 0);
  const avgSpeed = completedTrips.length > 0
    ? completedTrips.reduce((sum, t) => sum + t.avgSpeedKmh, 0) / completedTrips.length
    : 0;
  const maxSpeed = completedTrips.length > 0
    ? Math.max(...completedTrips.map((t) => t.maxSpeedKmh))
    : 0;

  return NextResponse.json({
    devices: { total: totalDevices, active: activeDevices, byType: devicesByType },
    trips: {
      total: totalTrips,
      active: activeTrips,
      completed: completedTrips.length,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDurationMin,
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      recent: recentTrips,
    },
    alerts: { total: totalAlerts, unread: unreadAlerts },
    geofences: { active: totalGeofences },
    positions: { total: totalPositions },
  }, { headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" } });
}
