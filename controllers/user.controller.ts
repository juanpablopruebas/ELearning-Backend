import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import cloudinary from "cloudinary";
import "dotenv/config";

import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import sendEmail from "../utils/sendEmail";
import {
  accessTokenOptions,
  createActivationObject,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getAllUsersService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service";
import {
  activateUserSchema,
  loginUserSchema,
  registerUserSchema,
  updateUserAvatarSchema,
  updateUserPasswordSchema,
  updateUserSchema,
  userSocialAuthSchema,
} from "../schemas/user.schema";
import {
  IActivationUser,
  ILoginUser,
  IRegistrationUser,
  ISocialAuthUser,
  IUpdateUser,
  IUpdateUserPassword,
} from "../interfaces/user.interface";

export const registerUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as IRegistrationUser;

      const { error } = registerUserSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const isEmailExist = await UserModel.findOne({ email });

      if (isEmailExist) {
        return next(new ErrorHandler("User already exists.", 400));
      }

      await UserModel.create({ name, email, password });

      const activationObject = createActivationObject(email);

      const activationCode = activationObject.code;
      // console.log("activationCode", activationCode);
      const data = {
        user: { name },
        activationCode,
      };

      try {
        await sendEmail({
          data,
          email,
          subject: "Account Activation",
          template: "activation.ejs",
        });

        res.status(201).json({
          success: true,
          message:
            "Account created successfully. Please check your email to activate your account.",
          activationToken: activationObject.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const activateUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { activation_token, activation_code } = req.body as IActivationUser;

    const { error } = activateUserSchema.validate(req.body);

    if (error) return next(new ErrorHandler(error.details[0].message, 400));

    try {
      const decoded = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret
      ) as { email: string; activationCode: string };

      if (decoded.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code.", 400));
      }

      const user = await UserModel.findOne({
        email: decoded.email,
      });

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      if (user?.isVerified) {
        return next(new ErrorHandler("User already verified.", 400));
      }

      await UserModel.updateOne({ email: decoded.email }, { isVerified: true });

      res.status(201).json({
        success: true,
        message: "Account activated successfully.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const loginUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginUser;

      const { error } = loginUserSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const user = await UserModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password.", 401));
      }

      if (!user.password) {
        return next(new ErrorHandler("Invalid password.", 401));
      }

      const isPasswordMatched = await user.comparePassword(password);

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password.", 401));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const logoutUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      const userId = req.user?._id as string;

      if (userId) {
        redis.del(userId);
      }

      res
        .status(200)
        .json({ success: true, message: "Logged out successfully." });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateAccessToken = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cookieRefreshToken = req.cookies.refreshToken;

      const message = "Could not refresh token.";

      if (!cookieRefreshToken) {
        // return next(new ErrorHandler(message, 400));
        return next();
      }

      const decoded = jwt.verify(
        cookieRefreshToken,
        process.env.REFRESH_TOKEN_SECRET || ""
      ) as JwtPayload;

      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      const session = await redis.get(decoded.id);

      if (!session) {
        return next(new ErrorHandler(message, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SECRET || "",
        { expiresIn: "1d" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET || "",
        { expiresIn: "3d" }
      );

      // req.user = user; //???

      res.cookie("accessToken", accessToken, accessTokenOptions);
      res.cookie("refreshToken", refreshToken, refreshTokenOptions);

      await redis.set(user._id, JSON.stringify(user), "EX", 604800);

      next();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const withCache = req.query.withCache === "true";
      const accessToken = req.cookies.accessToken;

      if (!accessToken) {
        return res.status(200).json({
          success: true,
          user: null,
        });
      }

      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET || ""
      ) as JwtPayload;

      if (!decoded) {
        return next(new ErrorHandler("Access token is not valid.", 400));
      }

      const user = await redis.get(decoded.id);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      req.user = JSON.parse(user);

      const userId = req.user?._id as string;

      if (!userId) {
        return next(new ErrorHandler("Invalid userId.", 400));
      }

      await getUserById(userId, res, next, withCache);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const socialAuth = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthUser;

      const { error } = userSocialAuthSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const user = await UserModel.findOne({ email });

      if (!user) {
        const newUser = await UserModel.create({
          email,
          name,
          avatar,
          isVerified: true,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as IUpdateUser;

      const { error } = updateUserSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const userId = req.user?._id as string;

      if (!userId) {
        return next(new ErrorHandler("Invalid userId.", 400));
      }

      const user = await UserModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      if (name && user) {
        user.name = name;
      }

      await user.save();

      await redis.set(user.id, JSON.stringify(user), "EX", 604800);

      res.status(201).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateUserPassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdateUserPassword;

      const { error } = updateUserPasswordSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const user = await UserModel.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid user.", 404));
      }

      const isPasswordMatch = await user?.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Old password does not match.", 400));
      }

      user.password = newPassword;

      await user.save();

      await redis.set(user.id, JSON.stringify(user), "EX", 604800);

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateUserAvatar = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as { avatar: string };

      const { error } = updateUserAvatarSchema.validate(req.body);

      if (error) return next(new ErrorHandler(error.details[0].message, 400));

      const user = await UserModel.findById(req.user?._id);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      if (user?.avatar.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
        width: 150,
      });
      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await user.save();

      await redis.set(user.id, JSON.stringify(user), "EX", 604800);

      res.status(200).json({ success: true, avatar: user.avatar });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllUsers = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateUserRole = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      await updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      await user.deleteOne();

      await redis.del(id);

      res
        .status(200)
        .json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
