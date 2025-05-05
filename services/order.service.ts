import { Response } from "express";
import OrderModel from "../models/order.model";

export const createNewOrder = async (data: any, res: Response) => {
  const course = await OrderModel.create(data);

  return res.status(201).json({
    success: true,
    course,
  });
};

export const getAllOrdersService = async (
  res: Response,
) => {
  const orders = await OrderModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    orders
  });
};
