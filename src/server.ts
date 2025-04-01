import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// MIDDLEWARE
import { authenticateToken } from "./middleware/authMiddleware";

// ROUTES
import authRoutes from "./routes/auth";
import profilesRoutes from "./routes/profiles";
import medicationRoutes from "./routes/medications";

// ENV
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CONFIG MIDDLEWARE
app.use(
  cors({
    // TODO: Cambiar a la URL del frontend en producción
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// DEF ROUTES

// PUBLIC ROUTES
app.use("/api/auth", authRoutes);

// PROTECTED ROUTES (JWT AUTHENTICATION)
app.use("/api/profiles", authenticateToken, profilesRoutes);
app.use("/api/medications", authenticateToken, medicationRoutes);

// TEST ROUTE
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend funcionando!" });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
