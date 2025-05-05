import "dotenv/config";
import mongoose from "mongoose";

const dbURL = process.env.DB_URL || "";

const connectionBD = async () => {
  try {
    await mongoose.connect(dbURL);
    console.log("Database connected");
  } catch (error) {
    if (error instanceof Error) {
      console.log("Error connecting to the database", error.message);
    } else {
      console.log("Error connecting to the database", error);
    }
    setTimeout(connectionBD, 5000);
  }
};

export default connectionBD;
