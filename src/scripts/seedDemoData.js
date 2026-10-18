// Seeds demo users, videos, likes, comments and subscriptions from seed/pixabay-videos.json.
//
// Run from the backend root:
//   node src/scripts/seedDemoData.js --dry-run   (preview only, writes nothing)
//   node src/scripts/seedDemoData.js             (writes to the database in your .env)
//
// Safe to re-run: existing users and videos are detected and skipped.
//
// NOTE: adjust the two model import paths marked below if your file names differ.

import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import connectDB from "../db/index.js";
import User from "../models/user.model.js"; // <- adjust the file name if needed
import Video from "../models/video.models.js";
import { Comment } from "../models/comments.model.js"; // <- adjust the file name if needed
import { Like } from "../models/likes.model.js";
import Subscription from "../models/subcription.model.js"; // field is spelled "subscrber" in this model

const DRY_RUN = process.argv.includes("--dry-run");
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@1234";
const SEED_FILE = path.resolve("seed", "pixabay-videos.json");

const CHANNEL_NAMES = {
  nature_vibes: "Nature Vibes",
  wanderlens: "Wanderlens",
  tastetrail: "Taste Trail",
  devdesk: "Dev Desk",
  fitzone: "Fit Zone",
};

const COMMENTS = [
  "Beautiful shot!",
  "This is so relaxing to watch.",
  "Great quality, thanks for sharing.",
  "Where was this filmed?",
  "Love the colours in this one.",
  "Needed this today.",
  "Saving this for later.",
  "Amazing footage!",
  "The framing here is perfect.",
  "Could watch this on loop all day.",
];

// ---------- helpers ----------
const DAY = 86_400_000;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const randomDateBetween = (from, to) =>
  new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
const sameId = (a, b) => String(a) === String(b);

// Rehost a Pixabay thumbnail on Cloudinary (deterministic id, so re-runs don't duplicate).
async function rehostThumbnail(item) {
  try {
    const res = await cloudinary.uploader.upload(item.thumbnailUrl, {
      folder: "seed/thumbnails",
      public_id: `pixabay-${item.pixabayId}`,
      overwrite: false,
      resource_type: "image",
    });
    return res.secure_url;
  } catch (err) {
    console.warn(
      `  thumbnail rehost failed for ${item.pixabayId}, using the Pixabay URL: ${err.message}`
    );
    return item.thumbnailUrl;
  }
}

// Insert a Cloudinary transformation into an already-uploaded image URL.
function withTransform(url, transformation) {
  return url.includes("/upload/")
    ? url.replace("/upload/", `/upload/${transformation}/`)
    : url;
}

// ---------- main ----------
async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(
      `Missing ${SEED_FILE}. Run scripts/fetchPixabayVideos.js first.`
    );
    process.exit(1);
  }

  const { items } = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const byChannel = {};
  for (const item of items) (byChannel[item.channel] ??= []).push(item);

  if (DRY_RUN) {
    console.log("DRY RUN: nothing will be written.");
    for (const [channel, list] of Object.entries(byChannel)) {
      console.log(`  @${channel}: ${list.length} videos`);
    }
    console.log(
      `Would create up to ${Object.keys(byChannel).length} users and ${items.length} videos.`
    );
    return;
  }

  const required = [
    "MONGO_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing in .env: ${missing.join(", ")}`);
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  await connectDB();
  console.log(
    `Target database: "${mongoose.connection.name}" on ${mongoose.connection.host}`
  );
  console.log("Starting in 5 seconds. Press Ctrl+C to cancel.");
  await sleep(5000);

  const users = {};
  const newVideos = []; // engagement is only seeded for videos created in this run

  // ----- users + videos -----
  for (const [username, list] of Object.entries(byChannel)) {
    console.log(`\n@${username}`);

    const thumbs = new Map();
    for (const item of list)
      thumbs.set(item.pixabayId, await rehostThumbnail(item));

    let user = await User.findOne({ username });
    if (!user) {
      const first = thumbs.get(list[0].pixabayId);
      const second = thumbs.get((list[1] ?? list[0]).pixabayId);
      // create() (not insertMany) so the password-hashing hook runs
      user = await User.create({
        username,
        email: `${username}@example.com`,
        fullName: CHANNEL_NAMES[username] ?? username,
        password: DEMO_PASSWORD,
        avatar: withTransform(first, "c_fill,g_auto,w_256,h_256"),
        coverImage: withTransform(second, "c_fill,g_auto,w_1280,h_320"),
      });
      console.log("  created user");
    } else {
      console.log("  user already exists");
    }
    users[username] = user;

    let added = 0;
    for (const item of list) {
      if (await Video.exists({ videoFile: item.videoUrl })) continue;

      const createdAt = randomDateBetween(daysAgo(45), daysAgo(1));
      const video = await Video.create({
        title: item.title,
        description: item.description,
        videoFile: item.videoUrl,
        thumbnail: thumbs.get(item.pixabayId),
        duration: item.duration,
        owner: user._id,
        views: rand(150, 20000),
        isPublished: true,
        createdAt,
        updatedAt: createdAt,
      });
      newVideos.push(video);
      added += 1;
    }
    console.log(`  videos: ${added} added, ${list.length - added} skipped`);
  }

  const allUsers = Object.values(users);

  // ----- likes + comments (only on newly created videos) -----
  const likes = [];
  const comments = [];
  for (const video of newVideos) {
    const others = allUsers.filter((u) => !sameId(u._id, video.owner));
    if (!others.length) continue;

    for (const u of shuffle(others).slice(0, rand(1, others.length))) {
      const at = randomDateBetween(video.createdAt, new Date());
      likes.push({
        video: video._id,
        likedBy: u._id,
        createdAt: at,
        updatedAt: at,
      });
    }

    const commentCount = rand(0, 3);
    for (let i = 0; i < commentCount; i++) {
      const at = randomDateBetween(video.createdAt, new Date());
      comments.push({
        content: pick(COMMENTS),
        video: video._id,
        owner: pick(others)._id,
        createdAt: at,
        updatedAt: at,
      });
    }
  }
  if (likes.length) await Like.insertMany(likes);
  if (comments.length) await Comment.insertMany(comments);

  // ----- subscriptions (spread over the last 30 days) -----
  let subs = 0;
  for (const subscriber of allUsers) {
    const targets = shuffle(
      allUsers.filter((u) => !sameId(u._id, subscriber._id))
    ).slice(0, rand(2, 3));
    for (const channel of targets) {
      const exists = await Subscription.exists({
        subscrber: subscriber._id,
        channel: channel._id,
      });
      if (exists) continue;
      const at = randomDateBetween(daysAgo(30), new Date());
      await Subscription.create({
        subscrber: subscriber._id,
        channel: channel._id,
        createdAt: at,
        updatedAt: at,
      });
      subs += 1;
    }
  }

  console.log("\nDone.");
  console.log(
    `  videos: ${newVideos.length}, likes: ${likes.length}, comments: ${comments.length}, subscriptions: ${subs}`
  );
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD}):`);
  for (const u of allUsers) console.log(`  ${u.email}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
