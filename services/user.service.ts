import { NextFunction, Response } from "express";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/ErrorHandler";
import UserModel from "../models/user.model";

export const getUserById = async (
  id: string,
  res: Response,
  next: NextFunction,
  noCache: boolean
) => {
  if (noCache) {
    const user = await UserModel.findById(id);

    return res.status(200).json({
      success: true,
      user,
    });
  }
  const userJson = await redis.get(id);

  if (userJson) {
    const parsedUser = JSON.parse(userJson);

    return res.status(200).json({
      success: true,
      user: parsedUser,
    });
  }
  return next(new ErrorHandler("User not found.", 404));
};

export const getAllUsersService = async (res: Response) => {
  const users = await UserModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    users,
  });
};

export const updateUserRoleService = async (
  res: Response,
  id: string,
  role: string
) => {
  const user = await UserModel.findByIdAndUpdate(id, { role }, { new: true });

  res.status(201).json({
    success: true,
    user,
  });
};
