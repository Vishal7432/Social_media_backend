import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/"); // specify the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    cd(null, file.originalname); // use the original file name for the uploaded file
  },
});

const upload = multer({ storage: storage });

export default upload;
