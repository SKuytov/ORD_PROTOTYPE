import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // All API routes are proxied to the existing PartPulse backend on port 3000
  // This frontend build connects directly to the existing MySQL backend
  return httpServer;
}
