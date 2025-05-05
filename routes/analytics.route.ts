import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getCourseAnalytics, getOrderAnalytics, getUserAnalytics } from "../controllers/analytics.controller";

const analyticRouter = express.Router();

analyticRouter.get(
  "/get-user-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getUserAnalytics
);

analyticRouter.get(
  "/get-course-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getCourseAnalytics
);

analyticRouter.get(
  "/get-order-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getOrderAnalytics
);

export default analyticRouter;
