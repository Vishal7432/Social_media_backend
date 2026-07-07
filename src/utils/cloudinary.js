import fs from "fs";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: ".env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folder) => {
  try {
    if (!file || !fs.existsSync(file)) {
      console.error("Cloudinary upload failed: file does not exist", file);
      return null;
    }

    const response = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
      folder,
    });

    console.log("file is uploaded on cloudinary", response.url);
    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    if (file && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    return null;
  }
};

export default uploadToCloudinary;
