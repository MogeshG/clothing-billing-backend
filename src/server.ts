import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = parseInt(process.env.PORT || "3000", 10);

const startServer = async (): Promise<void> => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api/v1`);
    });

    const shutdown = (signal: string): void => {
      console.log(`${signal} received. Shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(1);
      });
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
