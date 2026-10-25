import mongoose from "mongoose";

const videoViewSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

videoViewSchema.index({ owner: 1, createdAt: 1 });

export default mongoose.model("VideoView", videoViewSchema);
