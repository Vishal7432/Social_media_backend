import asyncHandler from "../utils/asyncFunction.js";
import apiError from "../utils/apiError.js";
import User from "../models/user.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";

const generateAccessAndRefreshTokens = async (user_id) => {
  try {
    const user = await User.findById(user_id);
    if (!user) {
      throw new apiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // console.log("Generated access token:", accessToken);
    // console.log("Generated refresh token:", refreshToken);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access tokens for user with id: " +
        user_id
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
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

const loginUser = asyncHandler(async (req, res) => {
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

  if (!(email || username)) {
    throw new apiError(400, "All fields are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }], // ya to email through access do ya username ke..
  });

  if (!user) {
    throw new apiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );
  // // console.log("Access Token:", accessToken);
  // // console.log("Refresh Token:", refreshToken);

  const foundUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // set to true in production
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        user: foundUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, "User logged out successfully", null));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized request, refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, "Invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new apiError(400, "Both current and new passwords are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new apiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully", null));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Current user profile fetched successfully",
        req.user
      )
    );
});

const updateAcountDetails = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      fullName,
      username,
      email,
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successfully", user));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avtar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover image file is missing");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImageLocalPath,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image updated successfully", user));
});

// todo: delete old avatar and cover image from cloudinary when updating new ones
const deleteOldAvatarAndCoverImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new apiError(404, "User not found");
  }

  if (user.avatar) {
    await deleteFromCloudinary(user.avatar);
  }

  if (user.coverImage) {
    await deleteFromCloudinary(user.coverImage);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Old avatar and cover image deleted successfully",
        user
      )
    );
});

// aggregate pipelines for user profile with posts, followers, following, and subscriptions can be implemented here in the future.

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new apiError(
      400,
      "user not found, username is required in the request params"
    );
  }

  // Fetch user profile along with posts, followers, following, and subscriptions using aggregation pipelines
  const channelProfile = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
    },
    {
      lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "channelsSubscribedTo",
      },
    },
    {
      addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$channelsSubscribedTo" },
        isSubscribed: {
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channelProfile?.length) {
    throw new apiError(
      404,
      "channel does not exist, user not found with the provided username"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Channel profile fetched successfully",
        channelProfile[0]
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUserProfile,
  updateAcountDetails,
  updateAvatar,
  updateCoverImage,
  deleteOldAvatarAndCoverImage,
};
