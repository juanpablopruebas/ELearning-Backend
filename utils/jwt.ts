import "dotenv/config";
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import jwt, { Secret } from "jsonwebtoken";

interface ITokenOptions {
  expiresIn: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none";
  secure?: boolean;
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "1");
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "3");

export const accessTokenOptions: ITokenOptions = {
  expiresIn: new Date(Date.now() + accessTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
  // secure: true,
};

export const refreshTokenOptions: ITokenOptions = {
  expiresIn: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
  // secure: true,
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // redis.set(user.id, JSON.stringify(user));
  redis.set(user.id, JSON.stringify(user), "EX", 604800);

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  res.cookie("accessToken", accessToken, accessTokenOptions);
  // res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
  });
};

export const createActivationObject = (email: string) => {
  const code = Math.floor(1000 + Math.random() * 8999).toString();

  const tokenPayload = {
    email,
    activationCode: code,
  };

  const token = jwt.sign(
    tokenPayload,
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "60m",
    }
  );

  return { token, code };
};
