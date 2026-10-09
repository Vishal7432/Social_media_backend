import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedVideoTypes = [
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/quicktime",
  ];
  const imageFields = ["avatar", "coverImage", "thumbnail", "image"];
  const videoFields = ["video", "videoFile"];
  const isAllowedImage =
    imageFields.includes(file.fieldname) && file.mimetype.startsWith("image/");
  const isAllowedVideo =
    videoFields.includes(file.fieldname) &&
    allowedVideoTypes.includes(file.mimetype);

  if (isAllowedImage || isAllowedVideo) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type for this upload field"));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});

export const uploadPostImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("image");
