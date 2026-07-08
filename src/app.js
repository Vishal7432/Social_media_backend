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
//

// handle unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
});

export default app;
