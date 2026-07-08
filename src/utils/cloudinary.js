import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folder = "") => {
  try {
    if (!localFilePath) return null;
    const uploadOptions = { resource_type: "auto" };
    if (folder) {
      uploadOptions.folder = folder;
    }

    const response = await cloudinary.uploader.upload(
      localFilePath,
      uploadOptions
    );
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

export default uploadOnCloudinary;
