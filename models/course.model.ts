import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./user.model";

interface IComment extends Document {
  user: IUser;
  question: string;
  questionReplies: IComment[];
}

interface IReview extends Document {
  user: IUser;
  rating: number;
  comment: string;
  commentReplies: IComment[];
}

interface ILink extends Document {
  title: string;
  url: string;
}

interface ICourseData extends Document {
  description: string;
  links: ILink[];
  questions: IComment[];
  suggestion: string;
  videoTitle: string;
  videoLength: Number;
  videoPlayer: string;
  sectionTitle: string;
  videoThumbnail: string;
  videoUrl: string;
}

export interface ICourse extends Document {
  name: string;
  description: string;
  categories: string;
  price: number;
  estimatedPrice?: number;
  thumbnail: {
    public_id: string;
    url: string;
  };
  tags: string;
  level: string;
  demoUrl: string;
  benefits: {
    title: string;
  }[];
  prerequisites: {
    title: string;
  }[];
  reviews: IReview[];
  courseData: ICourseData[];
  ratings?: number;
  purchased: number;
}

const reviewSchema: Schema<IReview> = new Schema(
  {
    user: Object,
    rating: {
      type: Number,
      default: 0,
    },
    comment: String,
    commentReplies: [Object],
  },
  { timestamps: true }
);

const linkSchema: Schema<ILink> = new Schema({
  title: String,
  url: String,
});

const commentSchema: Schema<IComment> = new Schema(
  {
    user: Object,
    question: String,
    questionReplies: [Object],
  },
  { timestamps: true }
);

const courseDataSchema: Schema<ICourseData> = new Schema({
  description: String,
  links: [linkSchema],
  questions: [commentSchema],
  suggestion: String,
  videoTitle: String,
  videoLength: Number,
  videoPlayer: String,
  sectionTitle: String,
  videoThumbnail: Object,
  videoUrl: String,
});

const courseSchema: Schema<ICourse> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    categories: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    estimatedPrice: {
      type: Number,
    },
    thumbnail: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    tags: {
      required: true,
      type: String,
    },
    level: {
      required: true,
      type: String,
    },
    demoUrl: {
      required: true,
      type: String,
    },
    benefits: [{ title: String }],
    prerequisites: [{ title: String }],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings: {
      type: Number,
      default: 0,
    },
    purchased: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const CourseModel = mongoose.model("Course", courseSchema);

export default CourseModel;
