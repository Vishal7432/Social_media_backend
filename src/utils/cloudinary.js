import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folder) => {
  try {
    if (!uploadToCloudinary) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localStorage, {
      resource_type: "auto",
    });
    // file has been successful uploaded
    console.log("file is uploaded on cloudinary", response.url);
    return response;
  } catch (error) {
    fs.unlikSync(localFilePath); // remove the locally saved temporary file as the upload operation.
    return null;
  }
};

export default uploadToCloudinary;
