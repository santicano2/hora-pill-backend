import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son requeridos" });
    }

    // Verifica si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear nuevo usuario
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: "Usuario registrado exitosamente.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en registro", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son requeridos" });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Usuario no encontrado
    }

    // Comparar la contraseña enviada con la hasheada
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Contraseña incorrecta
    }

    // Generar Token JWT
    const tokenPayload = { userId: user.id }; // Guarda el ID del usuario en el token
    const secret = process.env.JWT_SECRET as string;
    const options = { expiresIn: "1d" }; // El token expira en 1 día

    const token = jwt.sign(tokenPayload, secret, options);

    const { hashedPassword: _, ...userWithoutPassword } = user;

    // Enviar token
    res.json({
      message: "Login exitoso.",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

export default router;
