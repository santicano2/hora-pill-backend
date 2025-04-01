// backend/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Declara una variable global 'prisma' para reutilizar la instancia en desarrollo.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Crea o reutiliza la instancia de Prisma Client.
// 1. Intenta usar la instancia global si existe (entorno de desarrollo con hot-reload).
// 2. Si no existe, crea una nueva instancia.
const prismaClientInstance =
  global.prisma ||
  new PrismaClient({
    // Puedes añadir opciones aquí si las necesitas, como logs:
    // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// En desarrollo, asigna la instancia recién creada/obtenida a la variable global.
// Esto asegura que la próxima vez que este archivo se cargue (ej. por hot-reload),
// se reutilizará la misma instancia a través de 'global.prisma'.
if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaClientInstance;
}

// Exporta la instancia para que pueda ser importada en otras partes de tu backend.
// Usamos 'export const' para exportación nombrada, que es común.
export const prisma = prismaClientInstance;

// También puedes mantener la exportación por defecto si prefieres ese estilo de importación.
export default prisma;
