import { app } from "./app";
import connectDB from "./utils/db";
import cloudinary from "cloudinary";
import "dotenv/config";
import http from "http";
import { initSocketServer } from "./socketServer";

const server = http.createServer(app);

initSocketServer(server);

server.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
  connectDB();
});

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
