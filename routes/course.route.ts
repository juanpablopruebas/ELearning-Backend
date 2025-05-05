import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  addAnswer,
  addQuestion,
  addReview,
  deleteCourse,
  updateCourse,
  getAllCourses,
  getCourseContentByUser,
  getCourses,
  getSingleCourse,
  uploadCourse,
  addReplyToReview,
  getCoursesByUser,
  // generateVideoUrl,
} from "../controllers/course.controller";
// import { updateAccessToken } from "../controllers/user.controller";
const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  // updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateCourse
);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getCourses);
courseRouter.get("/get-courses", getCourses);
courseRouter.get("/get-courses-by-user", isAuthenticated, getCoursesByUser);
courseRouter.get(
  "/get-course-content/:id",
  isAuthenticated,
  getCourseContentByUser
);
courseRouter.post("/add-question", isAuthenticated, addQuestion);
courseRouter.post("/add-answer", isAuthenticated, addAnswer);
courseRouter.post("/add-review/:id", isAuthenticated, addReview);
courseRouter.post(
  "/add-reply",
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);
courseRouter.get(
  "/get-all-courses",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllCourses
);
courseRouter.delete(
  "/delete-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);
// courseRouter.post("/getVdoCipherOTP", generateVideoUrl);

export default courseRouter;
