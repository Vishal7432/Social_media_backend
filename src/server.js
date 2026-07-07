// require("dotenv").config();  old way of importing dotenv

import dotenv from "dotenv";

dotenv.config({ path: ".env" });

import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
  .then(() => {
    // Start your server or perform other operations after successful connection
    app.on("error", (error) => {
      console.error("Failed to connect to MongoDB:", error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
//

// Your other server setup code here
/*
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
    app.on("error", (error) => {
      console.error("Error connecting to MongoDB:", error);
    });
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
})();
*/
