import mongoose from "mongoose";
import Video from "../models/video.models.js";
import Subscription from "../models/subcription.model.js";
import { Like } from "../models/likes.model.js";
import VideoView from "../models/videoView.model.js";
import apiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncFunction.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new apiError(400, "Invalid channel id");
  }

  const ownerId = new mongoose.Types.ObjectId(channelId);
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  const [totalSubscribers, videoStats, dailyViews, dailySubscribers] =
    await Promise.all([
      Subscription.countDocuments({ channel: ownerId }),
      Video.aggregate([
        { $match: { owner: ownerId } },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: "$views" },
            videoIds: { $push: "$_id" },
          },
        },
      ]),
      VideoView.aggregate([
        { $match: { owner: ownerId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        { $match: { channel: ownerId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const totalVideos = videoStats[0]?.totalVideos || 0;
  const totalViews = videoStats[0]?.totalViews || 0;
  const videoIds = videoStats[0]?.videoIds || [];

  const totalLikes = await Like.countDocuments({ video: { $in: videoIds } });

  const viewsByDate = new Map(dailyViews.map(({ _id, count }) => [_id, count]));
  const subscribersByDate = new Map(
    dailySubscribers.map(({ _id, count }) => [_id, count])
  );
  const viewsTrend = [];
  const subscribersTrend = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + offset);
    const dateKey = date.toISOString().slice(0, 10);
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date);

    viewsTrend.push({ day, views: viewsByDate.get(dateKey) ?? 0 });
    subscribersTrend.push({
      day,
      subscribers: subscribersByDate.get(dateKey) ?? 0,
    });
  }

  const channelStats = {
    totalSubscribers,
    totalVideos,
    totalViews,
    totalLikes,
    viewsTrend,
    subscribersTrend,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new apiError(400, "Invalid channel id");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $project: {
        likes: 0,
      },
    },
  ]);

  if (!videos?.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No videos found for this channel"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
