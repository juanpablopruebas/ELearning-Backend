import { Request, Response, NextFunction } from "express";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel, { IOrder } from "../models/order.model";
import UserModel from "../models/user.model";
import CourseModel from "../models/course.model";
import { createNewOrder, getAllOrdersService } from "../services/order.service";
import sendEmail from "../utils/sendEmail";
import NotificationModel from "../models/notification.model";
import "dotenv/config";
import { redis } from "../utils/redis";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const createOrder = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      if (payment_info) {
        if ("id" in payment_info) {
          const paymentIntentId = payment_info.id;
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId
          );

          if (paymentIntent.status !== "succeeded") {
            return next(new ErrorHandler("Payment not authorized", 400));
          }
        }
      }

      const user = await UserModel.findById(req.user?._id);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      const userExistsInCourse = user.courses.some(
        (course) => course.courseId === courseId
      );

      if (userExistsInCourse) {
        return next(
          new ErrorHandler("You have already purchased this course.", 400)
        );
      }

      const data = {
        courseId: course.id,
        userId: user.id,
        payment_info: payment_info ? payment_info : "Free course",
      };

      // await createNewOrder(data, res);
      await OrderModel.create(data);

      const mailData = {
        order: {
          _id: course.id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      await sendEmail({
        email: user.email,
        subject: "Order Confirmation",
        template: "order-confirmation.ejs",
        data: mailData,
      });

      user.courses.push({ courseId: course.id });

      await redis.set(user?.id, JSON.stringify(user));

      await user.save();

      await NotificationModel.create({
        userId: user.id,
        title: "New Order",
        message: `You have a new order from: ${course.name}`,
      });

      course.purchased = course.purchased += 1;

      await course.save();

      res.status(201).json({
        success: true,
        userCourses: user.courses,
      });
    } catch (error: any) {
      console.log("error", error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllOrders = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const sendStripePublishableKey = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
);

export const createPayment = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "USD",
        metadata: {
          company: "E-Learning",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res
        .status(201)
        .json({ success: true, client_secret: myPayment.client_secret });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
