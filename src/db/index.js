import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const mongoBase = process.env.MONGO_URL.replace(/\/+$|\/+$/g, "").replace(
      /\/+$/,
      ""
    );
    const uri = `${mongoBase}/${DB_NAME}`;
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
    process.exit(1);
  }
};

export default connectDB;
