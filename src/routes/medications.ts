// backend/src/routes/medications.ts
import express from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client"; // Para tipos

const router = express.Router();

// --- Helper function para verificar propiedad del perfil ---
// Esta función comprueba si un perfil específico pertenece al usuario autenticado.
const checkProfileOwnership = async (
  profileId: string,
  userId: string
): Promise<boolean> => {
  if (!profileId || !userId) return false;
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true }, // Solo necesitamos el userId para verificar
    });
    return profile?.userId === userId;
  } catch (error) {
    console.error("Error verificando propiedad del perfil:", error);
    return false;
  }
};

// --- Obtener Medicamentos de un Perfil Específico ---
// GET /api/medications?profileId=<ID_DEL_PERFIL>
router.get("/", async (req, res) => {
  const userId = req.user?.id;
  const profileId = req.query.profileId as string; // Obtiene el ID del perfil de los query params

  if (!userId) return res.status(401).json({ message: "No autenticado." });
  if (!profileId)
    return res
      .status(400)
      .json({
        message:
          "Se requiere el ID del perfil (profileId) como query parameter.",
      });

  console.log(
    `GET /api/medications?profileId=${profileId} - Solicitado por userId: ${userId}`
  );

  try {
    // *** ¡Verificación de Seguridad Clave! ***
    // Asegúrate de que el perfil solicitado pertenece al usuario autenticado.
    const isOwner = await checkProfileOwnership(profileId, userId);
    if (!isOwner) {
      console.warn(
        `Acceso denegado: userId ${userId} intentó acceder a medicamentos del profileId ${profileId} que no le pertenece.`
      );
      // Devuelve 404 para ocultar la existencia del perfil a usuarios no autorizados
      return res
        .status(404)
        .json({ message: "Perfil no encontrado o no tienes permiso." });
    }

    // Si es el dueño, busca los medicamentos para ese perfil
    const medications = await prisma.medication.findMany({
      where: { profileId: profileId },
      orderBy: { name: "asc" }, // Ordena alfabéticamente (opcional)
    });
    console.log(
      `Encontrados ${medications.length} medicamentos para profileId ${profileId}`
    );
    res.json(medications);
  } catch (error: any) {
    console.error(
      `Error en GET /api/medications para profileId ${profileId}, userId ${userId}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Error al obtener los medicamentos.",
        error: error.message,
      });
  }
});

// --- Añadir un Nuevo Medicamento a un Perfil ---
// POST /api/medications
router.post("/", async (req, res) => {
  const userId = req.user?.id;
  // Extrae los datos del medicamento y el profileId del cuerpo de la petición
  const {
    profileId,
    name,
    dosage,
    currentStock,
    lowStockThreshold,
    takeTime,
    frequency,
    notes,
  } = req.body;

  if (!userId) return res.status(401).json({ message: "No autenticado." });
  if (
    !profileId ||
    !name ||
    currentStock === undefined ||
    currentStock === null
  ) {
    return res
      .status(400)
      .json({
        message: "Faltan datos requeridos (profileId, name, currentStock).",
      });
  }
  console.log(
    `POST /api/medications - Solicitado por userId: ${userId} para profileId: ${profileId}`
  );

  try {
    // *** ¡Verificación de Seguridad Clave! ***
    const isOwner = await checkProfileOwnership(profileId, userId);
    if (!isOwner) {
      console.warn(
        `Acceso denegado: userId ${userId} intentó añadir medicamento al profileId ${profileId} que no le pertenece.`
      );
      return res
        .status(404)
        .json({
          message:
            "Perfil no encontrado o no tienes permiso para añadirle medicamentos.",
        });
    }

    // Convierte currentStock y lowStockThreshold a números (vienen como string a veces de JSON)
    const stock = parseInt(currentStock, 10);
    const threshold =
      lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 5; // Valor por defecto si no se envía

    if (isNaN(stock) || isNaN(threshold)) {
      return res
        .status(400)
        .json({
          message:
            "currentStock y lowStockThreshold deben ser números válidos.",
        });
    }

    // Crea el medicamento asociado al perfil verificado
    const newMedication = await prisma.medication.create({
      data: {
        profileId,
        name,
        dosage: dosage || null,
        currentStock: stock,
        lowStockThreshold: threshold,
        takeTime: takeTime || null,
        frequency: frequency || null,
        notes: notes || null,
      },
    });
    console.log(
      `Medicamento '${name}' creado para profileId ${profileId} con ID: ${newMedication.id}`
    );
    res.status(201).json(newMedication);
  } catch (error: any) {
    console.error(
      `Error en POST /api/medications para profileId ${profileId}, userId ${userId}:`,
      error
    );
    // Manejo específico si hay un error de clave foránea (perfil no existe)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res
        .status(404)
        .json({ message: "El perfil especificado no existe." });
    }
    res
      .status(500)
      .json({
        message: "Error al añadir el medicamento.",
        error: error.message,
      });
  }
});

// --- Marcar un Medicamento como Tomado (Decrementa Stock) ---
// PATCH /api/medications/:medicationId/taken
router.patch("/:medicationId/taken", async (req, res) => {
  const userId = req.user?.id;
  const { medicationId } = req.params;

  if (!userId) return res.status(401).json({ message: "No autenticado." });
  if (!medicationId)
    return res
      .status(400)
      .json({ message: "Se requiere el ID del medicamento." });

  console.log(
    `PATCH /api/medications/${medicationId}/taken - Solicitado por userId: ${userId}`
  );

  try {
    // *** ¡Verificación de Seguridad Clave! ***
    // Necesitamos verificar que el medicamento pertenezca a un perfil del usuario.
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      select: {
        // Selecciona solo lo necesario para verificar y actualizar
        id: true,
        currentStock: true,
        profile: {
          // Incluye el perfil asociado
          select: { userId: true }, // Solo necesitamos el userId del perfil
        },
      },
    });

    // Verifica si el medicamento existe y si el userId del perfil asociado coincide
    if (!medication || medication.profile?.userId !== userId) {
      console.warn(
        `Acceso denegado: userId ${userId} intentó marcar como tomado el medicationId ${medicationId} que no le pertenece o no existe.`
      );
      return res
        .status(404)
        .json({ message: "Medicamento no encontrado o no tienes permiso." });
    }

    // Verifica si hay stock disponible
    if (medication.currentStock <= 0) {
      return res
        .status(400)
        .json({ message: "No hay stock disponible para este medicamento." });
    }

    // Si todo está bien, decrementa el stock
    const updatedMedication = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        currentStock: {
          decrement: 1,
        },
      },
    });
    console.log(
      `Stock decrementado para medicationId ${medicationId}. Nuevo stock: ${updatedMedication.currentStock}`
    );
    res.json(updatedMedication); // Devuelve el medicamento actualizado
  } catch (error: any) {
    console.error(
      `Error en PATCH /api/medications/${medicationId}/taken para userId ${userId}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Error al actualizar el stock del medicamento.",
        error: error.message,
      });
  }
});

// --- Opcional: Eliminar un Medicamento ---
// DELETE /api/medications/:medicationId
router.delete("/:medicationId", async (req, res) => {
  const userId = req.user?.id;
  const { medicationId } = req.params;

  if (!userId) return res.status(401).json({ message: "No autenticado." });
  if (!medicationId)
    return res
      .status(400)
      .json({ message: "Se requiere el ID del medicamento." });

  console.log(
    `DELETE /api/medications/${medicationId} - Solicitado por userId: ${userId}`
  );

  try {
    // *** ¡Verificación de Seguridad Clave! *** (Similar a PATCH)
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      select: { profile: { select: { userId: true } } },
    });

    if (!medication || medication.profile?.userId !== userId) {
      console.warn(
        `Acceso denegado: userId ${userId} intentó eliminar el medicationId ${medicationId} que no le pertenece o no existe.`
      );
      return res
        .status(404)
        .json({ message: "Medicamento no encontrado o no tienes permiso." });
    }

    // Si la verificación es exitosa, elimina el medicamento
    await prisma.medication.delete({
      where: { id: medicationId },
    });
    console.log(
      `Medicamento ${medicationId} eliminado exitosamente por userId ${userId}.`
    );
    res.status(204).send(); // 204 No Content (éxito sin cuerpo de respuesta)
  } catch (error: any) {
    console.error(
      `Error en DELETE /api/medications/${medicationId} para userId ${userId}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Error al eliminar el medicamento.",
        error: error.message,
      });
  }
});

// Aquí podrías añadir rutas para PUT (actualizar todos los datos de un medicamento)

export default router;
