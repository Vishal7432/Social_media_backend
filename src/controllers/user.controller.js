import asuncFunction from "../utils/asyncFunction.js";
import apiError from "../utils/apiError.js";
import User from "../models/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";

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

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  console.log("Existing user:", existingUser);

  if (existingUser) {
    throw new apiError(409, "User already exists");
  }

  // console.log("Files received:", req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // console.log("Avatar local path:", avatarLocalPath);
  // console.log("Cover image local path:", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar image is required");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath, "avatars");
  const coverImage = coverImageLocalPath
    ? await uploadToCloudinary(coverImageLocalPath, "coverImages")
    : null;

  if (!avatar) {
    throw new apiError(500, "Failed to upload avatar image");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // optional field, can be empty string if not provided
  });

  const foundUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!foundUser) {
    throw new apiError(500, "User not found after creation");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", foundUser));
});

const loginUser = asuncFunction(async (req, res) => {
  // get the user data from the request body mean from the frontend
  // validation - not empty fields, email format, password strength, etc.
  // check if the user exists in the database validation - email, username, etc.
  // if not, send an error response back to the frontend
  // if yes, check if the password is correct
  // if not, send an error response back to the frontend
  // if yes, generate a new access token and refresh token
  // save the refresh token to the database
  // send a response back to the frontend with the user data and a success message

  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    throw new apiError(400, "All fields are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new apiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }
});

export default { registerUser, loginUser };
