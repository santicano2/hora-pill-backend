// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extiende la interfaz Request de Express para incluir la propiedad 'user'
// Esto permite que TypeScript sepa que añadiremos esta propiedad.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string }; // Define la estructura del usuario que añadiremos
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Busca el token en el header 'Authorization'
  const authHeader = req.headers["authorization"];
  // El formato esperado es "Bearer TOKEN_JWT"
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    // Si no hay token, el usuario no está autorizado
    console.log("Auth Middleware: No token provided.");
    return res
      .status(401)
      .json({ message: "No autorizado: Se requiere token." });
  }

  // Verifica el token usando el secreto guardado en .env
  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: any, userPayload: any) => {
      if (err) {
        // Si hay un error (token inválido, expirado, etc.)
        console.error(
          "Auth Middleware: Error de verificación de token:",
          err.message
        );
        return res
          .status(403)
          .json({ message: "Prohibido: Token inválido o expirado." });
      }

      // El payload decodificado del token está en 'userPayload'.
      // Asegúrate de que el payload contenga el ID del usuario (lo llamamos 'userId' al crearlo).
      const userId = userPayload?.userId;

      if (!userId) {
        console.error(
          "Auth Middleware: Token válido pero no contiene ID de usuario ('userId')."
        );
        return res
          .status(403)
          .json({ message: "Prohibido: Token malformado." });
      }

      // Añade el ID del usuario al objeto 'req' para que las rutas posteriores puedan usarlo
      console.log(`Auth Middleware: Token verificado para userId: ${userId}`);
      req.user = { id: userId };

      // Continúa con la siguiente función de middleware o la ruta principal
      next();
    }
  );
};
