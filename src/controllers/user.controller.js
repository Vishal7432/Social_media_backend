import asuncFunction from "../utils/asyncFunction.js";
import apiError from "../utils/apiError.js";
import userModel from "../models/user.model.js";

const registerUser = asuncFunction(async (req, res) => {
  // get the user data from the request body mean from the frontend
  // validation - not empty fields, email format, password strength, etc.
  // check if the user already exists in the database validation - email, username, etc.
  // if not, create a new user in the database
  // check for images, check for avatar, if not, set a default avatar
  // upload the avatar to cloudinary and get the url
  // remove password and refreshToken from the user data before sending it back to the frontend
  // check user creation
  // save the user data to the database
  // send a response back to the frontend with the user data and a success message
  const { fullName, username, email, password } = req.body;
  console.log("User data:", { fullName, username, email, password });

  if ([fullName, username, email, password].some((field) => !field)) {
    throw new apiError(400, "All fields are required");
  }

  const existingUser = await userModel.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new apiError(409, "User already exists");
  }

  res
    .status(201)
    .json({ success: true, message: "User registered successfully" });
});

export default registerUser;
