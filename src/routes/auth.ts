// backend/src/routes/auth.ts
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma"; // Importa tu cliente Prisma singleton

const router = express.Router();
const SALT_ROUNDS = 10; // Factor de coste para bcrypt

// --- Ruta de Registro ---
// POST /api/auth/register
router.post("/register", async (req, res) => {
  console.log("POST /api/auth/register - Body:", req.body); // Log para depuración
  try {
    const { email, password, name } = req.body;

    // Validación básica de entrada
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son requeridos." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`Registro fallido: Email ${email} ya existe.`);
      return res.status(409).json({ message: "El email ya está registrado." }); // 409 Conflict
    }

    // Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log(`Registrando usuario ${email}...`);

    // Crear el usuario en la base de datos
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: name || null, // Guarda el nombre si se proporciona
      },
    });

    console.log(`Usuario ${email} registrado exitosamente con ID: ${user.id}`);

    // Importante: Nunca devuelvas la contraseña hasheada al cliente
    const { hashedPassword: _, ...userWithoutPassword } = user;
    res
      .status(201)
      .json({
        message: "Usuario registrado exitosamente.",
        user: userWithoutPassword,
      }); // 201 Created
  } catch (error: any) {
    console.error("Error en POST /api/auth/register:", error);
    res
      .status(500)
      .json({
        message: "Error interno del servidor durante el registro.",
        error: error.message,
      });
  }
});

// --- Ruta de Login ---
// POST /api/auth/login
router.post("/login", async (req, res) => {
  console.log("POST /api/auth/login - Body:", req.body); // Log para depuración
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son requeridos." });
    }

    // Buscar al usuario por email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Login fallido: Usuario ${email} no encontrado.`);
      // Devuelve un mensaje genérico por seguridad
      return res.status(401).json({ message: "Credenciales inválidas." }); // 401 Unauthorized
    }

    // Comparar la contraseña proporcionada con la hasheada almacenada
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      console.log(`Login fallido: Contraseña incorrecta para ${email}.`);
      // Devuelve un mensaje genérico por seguridad
      return res.status(401).json({ message: "Credenciales inválidas." }); // 401 Unauthorized
    }

    // Si las credenciales son válidas, generar un Token JWT
    const tokenPayload = {
      userId: user.id, // Incluye el ID del usuario en el payload del token
      // Puedes añadir otros datos si es necesario (ej. roles), pero mantenlo ligero
    };
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      console.error("Error crítico: JWT_SECRET no está definido en .env");
      return res
        .status(500)
        .json({ message: "Error de configuración del servidor." });
    }
    const options = { expiresIn: "1d" }; // El token expira en 1 día (puedes ajustarlo)

    const token = jwt.sign(tokenPayload, secret, options);
    console.log(`Login exitoso para ${email}. Token generado.`);

    // Prepara los datos del usuario para enviar (sin la contraseña)
    const { hashedPassword: _, ...userWithoutPassword } = user;

    // Enviar el token y los datos básicos del usuario al cliente
    res.json({
      message: "Inicio de sesión exitoso.",
      token, // El cliente guardará este token
      user: userWithoutPassword, // Datos del usuario para mostrar en el frontend
    });
  } catch (error: any) {
    console.error("Error en POST /api/auth/login:", error);
    res
      .status(500)
      .json({
        message: "Error interno del servidor durante el inicio de sesión.",
        error: error.message,
      });
  }
});

export default router; // Exporta el router para usarlo en server.ts
