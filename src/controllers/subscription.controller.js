import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import apiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // 1. channelId valid MongoDB ObjectId hai ya nahi, check karo
  if (!isValidObjectId(channelId)) {
    throw new apiError(400, "Invalid channel ID");
  }

  // 2. Jis channel (user) ko subscribe/unsubscribe karna hai, wo exist karta hai ya nahi
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new apiError(404, "Channel not found");
  }

  // 3. User apne aap ko subscribe na kar sake (edge case)
  if (channelId.toString() === req.user?._id.toString()) {
    throw new apiError(400, "You cannot subscribe to your own channel");
  }

  // 4. Check karo ki logged-in user (subscriber) pehle se is channel ko
  //    subscribe kiya hua hai ya nahi
  const existingSubscription = await Subscription.findOne({
    subscriber: req.user?._id, // jo subscribe kar raha hai
    channel: channelId, // jisko subscribe kiya ja raha hai
  });

  if (existingSubscription) {
    // 5a. Agar already subscribed hai, to unsubscribe kar do (document delete)
    await Subscription.findByIdAndDelete(existingSubscription._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully")
      );
  }

  // 5b. Agar subscribed nahi hai, to naya subscription document bana do
  await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // 1. channelId valid hai ya nahi
  if (!isValidObjectId(channelId)) {
    throw new apiError(400, "Invalid channel ID");
  }

  // 2. Subscription collection me un saare documents ko dhundo jaha
  //    "channel" field == is channelId ke barabar ho
  //    (matlab: jitne bhi logo ne is channel ko subscribe kiya hai)
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      // 3. Har subscription document ke "subscriber" field (jo ek userId hai)
      //    ko "users" collection se join karke us user ki details nikalo
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
        pipeline: [
          {
            // sirf zaroori fields hi bhejo, password/refreshToken jaisi
            // sensitive info avoid karo
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      // 4. $lookup ek array return karta hai, but yaha har subscriber
      //    sirf ek hi user hoga, isliye array se pehla element nikal lo
      $addFields: {
        subscriberDetails: { $first: "$subscriberDetails" },
      },
    },
    {
      // 5. Sirf subscriber ki details response me bhejo, baaki fields drop karo
      $project: {
        _id: 0,
        subscriberDetails: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  // 1. subscriberId valid hai ya nahi
  if (!isValidObjectId(subscriberId)) {
    throw new apiError(400, "Invalid subscriber ID");
  }

  // 2. Ab ulta logic: Subscription collection me un documents ko dhundo
  //    jaha "subscriber" field == is subscriberId ke barabar ho
  //    (matlab: is user ne kin-kin channels ko subscribe kiya hai)
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      // 3. Har document ke "channel" field (jo ek userId hai, kyunki
      //    channel bhi ek User hi hota hai is schema me) ko join karo
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      // 4. Array se pehla (aur ekmatra) element nikalo
      $addFields: {
        channelDetails: { $first: "$channelDetails" },
      },
    },
    {
      $project: {
        _id: 0,
        channelDetails: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
