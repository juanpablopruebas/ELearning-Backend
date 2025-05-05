import Joi from "joi";

export const registerUserSchema = Joi.object({
  name: Joi.string().min(2).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const activateUserSchema = Joi.object({
  activation_token: Joi.string().required(),
  activation_code: Joi.string().required(),
});

export const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const userSocialAuthSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  avatar: Joi.string().uri().optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
});

export const updateUserPasswordSchema = Joi.object({
  oldPassword: Joi.string().min(8).required(),
  newPassword: Joi.string().min(8).required(),
});

export const updateUserAvatarSchema = Joi.object({
  avatar: Joi.string().uri().required(),
});
