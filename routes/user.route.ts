import express from "express";
import {
  activateUser,
  deleteUser,
  getAllUsers,
  getUser,
  loginUser,
  logoutUser,
  registerUser,
  socialAuth,
  updateAccessToken,
  updateUser,
  updateUserAvatar,
  updateUserPassword,
  updateUserRole,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/activate", activateUser);
userRouter.post("/login", loginUser);
userRouter.get("/logout", isAuthenticated, logoutUser);
// userRouter.get("/refresh", updateAccessToken);
userRouter.get(
  "/me",
  // updateAccessToken,
  getUser
);
userRouter.post("/social-auth", socialAuth);
userRouter.put(
  "/update-user",
  //  updateAccessToken,
  isAuthenticated,
  updateUser
);
userRouter.put(
  "/update-user-password",
  // updateAccessToken,
  isAuthenticated,
  updateUserPassword
);
userRouter.put(
  "/update-user-avatar",
  // updateAccessToken,
  isAuthenticated,
  updateUserAvatar
);
userRouter.get(
  "/get-all-users",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);
userRouter.put(
  "/update-user-role",
  isAuthenticated,
  // authorizeRoles("admin"),  // Only for test
  updateUserRole
);
userRouter.delete(
  "/delete-user/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteUser
);

export default userRouter;
