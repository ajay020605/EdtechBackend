import express from "express";
import cors from "cors";
import prisma from "./prisma/client";
import authRoutes from "./routes/auth.routes";


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      message: "Server is running",
      database: "Connected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server running but DB not connected",
    });
  }
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});