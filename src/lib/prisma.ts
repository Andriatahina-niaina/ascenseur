import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Helper function to format connection error messages
function formatConnectionError(error: any): string {
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes("fatal alert") || errorMessage.includes("InternalError")) {
    return (
      "SSL/TLS Connection Error with MongoDB Atlas.\n\n" +
      "Common fixes:\n" +
      "1. Ensure your DATABASE_URL uses 'mongodb+srv://' protocol\n" +
      "2. Add query parameters: ?retryWrites=true&w=majority\n" +
      "3. Whitelist your IP address in MongoDB Atlas Network Access\n" +
      "4. Verify your MongoDB Atlas cluster is running\n" +
      "5. Check your username/password are correct\n\n" +
      "Example format:\n" +
      "mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority"
    );
  }
  
  if (errorMessage.includes("Server selection timeout")) {
    return (
      "Cannot connect to MongoDB Atlas servers.\n\n" +
      "Possible causes:\n" +
      "1. Network connectivity issues\n" +
      "2. IP address not whitelisted in MongoDB Atlas\n" +
      "3. Firewall blocking MongoDB ports (27017)\n" +
      "4. MongoDB Atlas cluster is paused or unavailable\n" +
      "5. Incorrect connection string format"
    );
  }
  
  return errorMessage;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Export error formatter for use in API routes
export { formatConnectionError };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

