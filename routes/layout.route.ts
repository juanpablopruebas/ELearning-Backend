import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createLayout, getLayout, updateLayout } from "../controllers/layout.controller";

const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);
layoutRouter.put(
  "/update-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  updateLayout
);
layoutRouter.get(
  "/get-layout/:type",
  getLayout
);

export default layoutRouter;
