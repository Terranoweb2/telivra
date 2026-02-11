import { z } from "zod";

export const createDeviceSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  serialNumber: z.string().min(1, "Numero de serie requis"),
  type: z.enum(["VEHICLE", "PERSON", "ASSET"]),
  vehicle: z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    year: z.number().optional(),
    licensePlate: z.string().min(1),
    color: z.string().optional(),
    fuelType: z.enum(["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"]).optional(),
  }).optional(),
  person: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
  }).optional(),
  asset: z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    value: z.number().optional(),
  }).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "LOST"]).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

export const positionSchema = z.object({
  serialNumber: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().optional(),
});
