import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscrber: {
      type: mongoose.Schema.Types.ObjectId, // one who is subscribing to another user
      ref: "User",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, // one who is being subscribed to
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
