// One-time fix: renames the misspelled "subscrber" field to "subscriber" in existing
// subscription documents (the ones created by the seed script).
//
// Run once from the backend root:
//   node src/scripts/fixSubscriptionField.js

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../db/index.js";
import Subscription from "../models/subcription.model.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await connectDB();
  console.log(
    `Target database: "${mongoose.connection.name}" on ${mongoose.connection.host}`
  );
  console.log("Starting in 3 seconds. Press Ctrl+C to cancel.");
  await sleep(3000);

  // Use the native collection so the (new) schema doesn't filter out the old field.
  const col = Subscription.collection;

  const renamed = await col.updateMany(
    { subscrber: { $exists: true } },
    { $rename: { subscrber: "subscriber" } }
  );
  console.log(`Renamed the field on ${renamed.modifiedCount} documents.`);

  // Documents with no subscriber at all are invalid (and inflate subscriber counts).
  const orphans = await col.countDocuments({ subscriber: { $exists: false } });
  console.log(`Documents without a subscriber: ${orphans}`);
  if (orphans > 0) {
    const removed = await col.deleteMany({ subscriber: { $exists: false } });
    console.log(`Removed ${removed.deletedCount} orphan documents.`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
