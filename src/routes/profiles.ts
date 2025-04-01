// backend/src/routes/profiles.ts
import express from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// --- Obtener Perfiles del Usuario Autenticado ---
// GET /api/profiles
router.get("/", async (req, res) => {
  // El middleware 'authenticateToken' ya verificó el token y añadió 'req.user'
  const userId = req.user?.id;

  // Doble check por si acaso (aunque el middleware debería prevenir esto)
  if (!userId) {
    return res.status(401).json({ message: "Usuario no autenticado." });
  }
  console.log(`GET /api/profiles - Solicitado por userId: ${userId}`);

  try {
    const profiles = await prisma.profile.findMany({
      where: {
        userId: userId, // Filtra los perfiles por el ID del usuario autenticado
      },
      orderBy: {
        createdAt: "asc", // Ordena por fecha de creación (opcional)
      },
    });
    console.log(
      `Encontrados ${profiles.length} perfiles para userId: ${userId}`
    );
    res.json(profiles); // Devuelve la lista de perfiles
  } catch (error: any) {
    console.error(`Error en GET /api/profiles para userId ${userId}:`, error);
    res
      .status(500)
      .json({
        message: "Error al obtener los perfiles.",
        error: error.message,
      });
  }
});

// --- Crear un Nuevo Perfil ---
// POST /api/profiles
router.post("/", async (req, res) => {
  const userId = req.user?.id;
  const { name } = req.body; // Obtiene el nombre del perfil del cuerpo de la petición

  if (!userId) {
    return res.status(401).json({ message: "Usuario no autenticado." });
  }

  // Validación simple del nombre
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res
      .status(400)
      .json({ message: "El nombre del perfil es requerido." });
  }
  console.log(
    `POST /api/profiles - Solicitado por userId: ${userId}, Nombre: ${name}`
  );

  try {
    const newProfile = await prisma.profile.create({
      data: {
        name: name.trim(), // Guarda el nombre sin espacios extra
        userId: userId, // Asocia el perfil al usuario autenticado
      },
    });
    console.log(
      `Perfil creado exitosamente para userId ${userId} con ID: ${newProfile.id}`
    );
    res.status(201).json(newProfile); // Devuelve el perfil recién creado
  } catch (error: any) {
    console.error(`Error en POST /api/profiles para userId ${userId}:`, error);
    res
      .status(500)
      .json({ message: "Error al crear el perfil.", error: error.message });
  }
});

// --- Opcional: Obtener un Perfil Específico (si es necesario) ---
// GET /api/profiles/:profileId
router.get("/:profileId", async (req, res) => {
  const userId = req.user?.id;
  const { profileId } = req.params;

  if (!userId) return res.status(401).json({ message: "No autenticado." });
  if (!profileId)
    return res.status(400).json({ message: "ID de perfil requerido." });

  console.log(
    `GET /api/profiles/${profileId} - Solicitado por userId: ${userId}`
  );

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    // Verifica si el perfil existe Y si pertenece al usuario autenticado
    if (!profile || profile.userId !== userId) {
      console.log(
        `Perfil ${profileId} no encontrado o no pertenece a userId ${userId}.`
      );
      // Devuelve 404 para no revelar si existe pero no pertenece al usuario
      return res.status(404).json({ message: "Perfil no encontrado." });
    }

    console.log(`Perfil ${profileId} encontrado para userId ${userId}.`);
    res.json(profile);
  } catch (error: any) {
    console.error(
      `Error en GET /api/profiles/${profileId} para userId ${userId}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error al obtener el perfil.", error: error.message });
  }
});

// Aquí podrías añadir rutas para PUT (actualizar) y DELETE (eliminar) perfiles
// siguiendo la misma lógica de verificación de pertenencia al usuario.

export default router;
