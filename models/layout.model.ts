import mongoose, { Document, Model, Schema } from "mongoose";

interface FaqItem extends Document {
  question: string;
  answer: string;
}

interface Category extends Document {
  title: string;
}

interface BannerImage extends Document {
  public_id: string;
  url: string;
}

interface Layout extends Document {
  type: string;
  faq: FaqItem[];
  categories: Category[];
  banner: {
    image: BannerImage;
    title: string;
    subTitle: string;
  };
}

const faqSchema: Schema<FaqItem> = new Schema(
  {
    question: {
      type: String,
    },
    answer: {
      type: String,
    },
  },
  { timestamps: true }
);

const categorySchema: Schema<Category> = new Schema(
  {
    title: {
      type: String,
    },
  },
  { timestamps: true }
);

const bannerSchema: Schema<BannerImage> = new Schema(
  {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  { timestamps: true }
);

const layoutSchema = new Schema(
  {
    type: {
      type: String,
    },
    faq: [faqSchema],
    categories: [categorySchema],
    banner: {
      image: bannerSchema,
      title: { type: String },
      subTitle: { type: String },
    },
  },
  { timestamps: true }
);

const LayoutModel = mongoose.model("Layout", layoutSchema);

export default LayoutModel;
