import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import "dotenv/config";

import CourseModel, { ICourse } from "../models/course.model";
import ErrorHandler from "../utils/ErrorHandler";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import { createCourse, getAllCoursesService } from "../services/course.service";
import { redis } from "../utils/redis";
import sendEmail from "../utils/sendEmail";
import NotificationModel from "../models/notification.model";

// *** thumbnail
export const uploadCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      if (thumbnail) {
        const mycloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = { public: mycloud.public_id, url: mycloud.secure_url };
      }

      await createCourse(data, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// *** thumbnail
export const updateCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const data = req.body;
      const thumbnail = data.thumbnail;

      const courseData = await CourseModel.findById(courseId);

      if (!courseData) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);

        const mycloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: mycloud.public_id,
          url: mycloud.secure_url,
        };
      } else if (thumbnail && thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail?.public_id,
          url: courseData?.thumbnail?.url,
        };
      }

      const updatedCourse = await CourseModel.findByIdAndUpdate(
        courseId,
        { $set: data },
        { new: true }
      );

      await redis.set(courseId, JSON.stringify(updatedCourse), "EX", 604800);

      res.status(200).json({
        success: true,
        course: updatedCourse,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getSingleCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const courseCached = await redis.get(courseId);

      if (courseCached) {
        const parsedCourse = JSON.parse(courseCached);
        return res.status(200).json({
          success: true,
          course: parsedCourse,
        });
      }

      const course = await CourseModel.findById(req.params.id).select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      return res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// *** Cached here???
export const getCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getCoursesByUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new ErrorHandler("User required.", 400));
      }

      const courses = (await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      )) as ICourse[];

      const filteredCourses = courses.filter((course) => {
        return user.courses.some(
          (c) =>
            c.courseId.toString() ===
            (course._id as mongoose.Types.ObjectId).toString()
        );
      });

      res.status(200).json({
        success: true,
        courses: filteredCourses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getCourseContentByUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExists = userCourseList?.find(
        (course) => course.courseId === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You do not have access to this course.", 400)
        );
      }

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // const content = course?.courseData;

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

// *** Valid mongo id
export const addQuestion = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId } = req.body as IAddQuestionData;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorHandler("Invalid course id.", 400));
      }

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id.", 400));
      }

      const courseContent = course?.courseData.find(
        (item) => item.id === contentId
      );

      if (!courseContent) {
        return next(new ErrorHandler("Course content not found.", 400));
      }

      if (!req.user) {
        return next(new ErrorHandler("User required.", 400));
      }

      const newQuestion = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion as any);

      await course.save();

      await NotificationModel.create({
        userId: req.user._id,
        title: "New Question Added",
        message: `You have a new question in: ${courseContent.videoTitle}`,
      });

      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, contentId, courseId, questionId } =
        req.body as IAddAnswerData;

      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(contentId) ||
        !mongoose.Types.ObjectId.isValid(questionId)
      ) {
        return next(new ErrorHandler("Invalid field id.", 400));
      }

      const user = req.user;

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      const courseContent = course?.courseData.find(
        (item) => item.id === contentId
      );

      if (!courseContent) {
        return next(new ErrorHandler("Course content not found.", 400));
      }

      const question = courseContent.questions.find(
        (item) => item.id === questionId
      );

      if (!question) {
        return next(new ErrorHandler("Course question not found", 400));
      }

      const newAnswer = {
        user: req.user,
        answer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      question.questionReplies.push(newAnswer as any);

      course.save();

      if (user._id === question.user._id) {
        await NotificationModel.create({
          userId: user._id,
          title: "New Answer Added",
          message: `You have a new answer in: ${courseContent.videoTitle}`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.videoTitle,
          appLink: `${process.env.APP_URL}`,
        };

        try {
          await sendEmail({
            email: question.user.name,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReviewData {
  review: string;
  rating: string;
}

export const addReview = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;

      const courseId = req.params.id;

      const courseExists = userCourseList?.some(
        (course) => course.courseId === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You do not have access to this course.", 400)
        );
      }

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      const { rating, review } = req.body as IAddReviewData;

      if (!req.user) {
        return next(new ErrorHandler("User required.", 400));
      }

      const reviewData = {
        user: req.user,
        rating,
        comment: review,
      };

      course.reviews.push(reviewData as any);

      let avg = 0;

      course.reviews.forEach((review) => (avg += review.rating));

      course.ratings = avg / course.reviews.length;

      await course.save();

      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      await NotificationModel.create({
        userId: req.user._id,
        title: "You received a review.",
        message: `${req.user.name} has given a review in ${course.name}`,
      });

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReplyToReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReplyToReviewData;

      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(reviewId)
      ) {
        return next(new ErrorHandler("Invalid field id.", 400));
      }

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      const review = course.reviews.find((item) => item.id === reviewId);

      if (!review) {
        return next(new ErrorHandler("Review not found.", 404));
      }

      const replyData = {
        user: req.user,
        comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      review.commentReplies.push(replyData as any);

      course.save();

      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("Course not found.", 404));
      }

      await course.deleteOne();

      await redis.del(id);

      res
        .status(200)
        .json({ success: true, message: "Course deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// export const generateVideoUrl = CatchAsyncErrors(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { videoId } = req.body;
//       const response = await axios.post(
//         `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
//         { ttl: 300 },
//         {
//           headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//             Authorization: `Apisecret ${process.env.VDO_CIPHER_API_SECRET}`,
//           },
//         }
//       );

//       res.json(response.data);
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   }
// );
