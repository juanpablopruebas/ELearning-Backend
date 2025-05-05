import { Request, Response, NextFunction } from "express";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";

export const createLayout = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const isTypeExist = await LayoutModel.findOne({ type });

      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exists`, 400));
      }

      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const mycloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          image: {
            public_id: mycloud.public_id,
            url: mycloud.secure_url,
          },
          title,
          subTitle,
        };
        await LayoutModel.create({ type, banner });
      }

      if (type === "FAQ") {
        const { faq } = req.body;
        const faqItems = faq.map(async (faqItem: any) => ({
          question: faqItem.question,
          answer: faqItem.answer,
        }));
        await LayoutModel.create({ type, faq: faqItems });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoryItems = categories.map(async (categoryItem: any) => ({
          title: categoryItem.title,
        }));
        await LayoutModel.create({ type, categories: categoryItems });
      }

      return res.status(201).json({
        success: true,
        message: "Layout created successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateLayout = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const layoutData = await LayoutModel.findOne({ type });

      if (!layoutData) {
        return next(new ErrorHandler("Layout not found.", 404));
      }

      if (type === "Banner") {
        const { image, title, subTitle } = req.body;

        const isNewImage = !image.startsWith("https://");

        let newImage: cloudinary.UploadApiResponse | null = null;

        if (isNewImage) {
          newImage = await cloudinary.v2.uploader.upload(image, {
            folder: "layout",
          });

          if (layoutData.banner?.image?.public_id) {
            await cloudinary.v2.uploader.destroy(
              layoutData.banner.image.public_id
            );
          }
        }

        const banner = {
          type,
          image: {
            public_id:
              isNewImage && newImage
                ? newImage.public_id
                : layoutData.banner?.image?.public_id,
            url:
              isNewImage && newImage
                ? newImage.secure_url
                : layoutData.banner?.image?.url,
          },
          title,
          subTitle,
        };
        await LayoutModel.findOneAndUpdate({ type }, { banner });
      }

      if (type === "FAQ") {
        const { faq } = req.body;

        const faqItems = faq.map((faqItem: any) => ({
          question: faqItem.question,
          answer: faqItem.answer,
        }));

        await LayoutModel.findOneAndUpdate(
          { type },
          {
            faq: faqItems,
          }
        );
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoryItems = categories.map((categoryItem: any) => ({
          title: categoryItem.title,
        }));
        await LayoutModel.findOneAndUpdate(
          { type },
          {
            categories: categoryItems,
          }
        );
      }

      return res.status(200).json({
        success: true,
        message: "Layout updated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getLayout = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params;
      const layout = await LayoutModel.findOne(type);

      return res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
