import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "50mb" }));

app.use(
  cookieParser({
    secret: process.env.COOKIE_SECRET,
    sameSite: "none",
    secure: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

// router imports
import userRoutes from "./routes/user.routes.js";

// router middleware declaration
app.use("/api/v1/users", userRoutes);

// https:localhost:8000/api/v1/users/register

export default app;
