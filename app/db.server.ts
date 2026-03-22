import { PrismaClient } from "@prisma/client";

// Add BigInt serialization support for json() responses
if (typeof BigInt !== "undefined" && !("toJSON" in BigInt.prototype)) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prisma = global.prismaGlobal || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
