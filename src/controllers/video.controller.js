import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const pipeline = [];

  // 1. Match stage - filter by search query (title/description) and userId
  const matchStage = {};

  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  // Only show published videos to public
  matchStage.isPublished = true;

  pipeline.push({ $match: matchStage });

  // 2. Lookup owner details
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "ownerDetails",
      pipeline: [
        {
          $project: {
            username: 1,
            avatar: 1,
            fullName: 1,
          },
        },
      ],
    },
  });

  pipeline.push({
    $addFields: {
      ownerDetails: { $first: "$ownerDetails" },
    },
  });

  // 3. Sort stage
  const sortStage = {};
  if (sortBy && sortType) {
    sortStage[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortStage.createdAt = -1; // default: newest first
  }
  pipeline.push({ $sort: sortStage });

  // 4. Pagination using aggregatePaginate
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videoAggregate = Video.aggregate(pipeline);

  const videos = await Video.aggregatePaginate(videoAggregate, options);

  if (!videos || videos.docs.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No videos found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  // 1. Validation - title aur description required
  if (!title || title.trim() === "") {
    throw new ApiError(400, "Title is required");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description is required");
  }

  // 2. Local file paths nikalna (multer ne req.files mein daala hai)
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  // 3. Cloudinary pe upload karna
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file upload failed");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  // 4. Video document create karna DB mein
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration, // cloudinary video response mein duration milta hai
    owner: req.user?._id,
    isPublished: true,
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  // 5. Response bhejna
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  //TODO: update video details like title, description, thumbnail

  // 1. videoId valid hai ya nahi
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!title && !description && !req.file) {
    throw new ApiError(400, "At least one field is required to update");
  }

  // 2. Video exist karti hai ya nahi, aur ownership check
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  // 3. Update object dynamically banate hain - jo field aaya usi ko update karo
  const updateFields = {};

  if (title) updateFields.title = title;
  if (description) updateFields.description = description;

  // 4. Agar naya thumbnail aaya hai to cloudinary pe upload karo
  let thumbnail;
  const thumbnailLocalPath = req.file?.path;

  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail?.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }

    updateFields.thumbnail = thumbnail.url;
  }

  // 5. DB mein update karo
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating video");
  }

  // 6. Purana thumbnail cloudinary se delete kar do (agar naya upload hua ho)
  if (thumbnail?.url && video.thumbnail) {
    await deleteFromCloudinary(video.thumbnail);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // Delete the video from Cloudinary
  if (video.videoFile) {
    await deleteFromCloudinary(video.videoFile);
  }
  if (video.thumbnail) {
    await deleteFromCloudinary(video.thumbnail);
  }

  // Delete the video from the database
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // TODO: toggle publish status
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Publish status toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
