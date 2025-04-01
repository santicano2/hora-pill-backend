import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extiende la interfaz Request de Express para incluir la propiedad 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res
      .status(401)
      .json({ message: "No autorizado: Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      console.error("Error de verificación de token:", err.message);
      return res
        .status(403)
        .json({ message: "Prohibido: Token inválido o expirado" });
    }

    // Si el token es válido, el payload decodificado está en 'user'
    const userId = user.userId || user.sub;

    if (!userId) {
      console.error("Token válido pero no contiene ID de usuario.");
      return res.status(403).json({ message: "Prohibido: Token malformado." });
    }

    req.user = { id: userId }; // Añade el id del usuario al objeto request
    next(); // Pasa al siguiente middleware o ruta
  });
};
