import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createOrder,
  createPayment,
  getAllOrders,
  sendStripePublishableKey,
} from "../controllers/order.controller";

const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);
orderRouter.get(
  "/get-all-orders",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllOrders
);

orderRouter.get(
  "/payment/stripe-key",
  // isAuthenticated,
  sendStripePublishableKey
);

orderRouter.post("/create-payment", isAuthenticated, createPayment);

export default orderRouter;
