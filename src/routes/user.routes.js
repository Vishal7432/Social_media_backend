import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secure route for logout, only logged in users can logout
router.route("/logout").post(verifyJWT, logoutUser);

// secure route for refreshing access token, only logged in users can refresh their access token
router.route("/refresh-token").post(refreshAccessToken);

export default router;
