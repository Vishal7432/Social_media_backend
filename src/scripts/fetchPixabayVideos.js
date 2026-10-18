// Fetches demo videos from the Pixabay API and caches them in seed/pixabay-videos.json.
//
// Usage (run from the backend root):
//   node scripts/fetchPixabayVideos.js [videosPerChannel]
//   e.g. node scripts/fetchPixabayVideos.js 10   -> 5 channels x 10 = 50 videos
//
// Needs PIXABAY_API_KEY in the backend .env. The key is never written to the output file.

import "dotenv/config";
import fs from "fs";
import path from "path";

const API_KEY = process.env.PIXABAY_API_KEY;
const PER_CHANNEL = Number(process.argv[2]) || 10;
const OUT_FILE = path.resolve("seed", "pixabay-videos.json");
const CACHE_HOURS = 24; // Pixabay asks that responses are cached for 24 hours

// Each demo channel maps to one valid Pixabay video category.
const CHANNELS = [
  { channel: "nature_vibes", category: "nature" },
  { channel: "wanderlens", category: "travel" },
  { channel: "tastetrail", category: "food" },
  { channel: "devdesk", category: "computer" },
  { channel: "fitzone", category: "sports" },
];

if (!API_KEY) {
  console.error(
    "PIXABAY_API_KEY is missing. Add it to your backend .env file."
  );
  process.exit(1);
}

// Reuse the cached file if it is fresh, so we don't hit the API again.
if (fs.existsSync(OUT_FILE)) {
  const ageHours = (Date.now() - fs.statSync(OUT_FILE).mtimeMs) / 36e5;
  if (ageHours < CACHE_HOURS) {
    console.log(
      `Cached file is only ${ageHours.toFixed(1)}h old, reusing it. Delete ${OUT_FILE} to refetch.`
    );
    process.exit(0);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toTitle(tags = "") {
  const words = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!words.length) return "Untitled clip";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" · ");
}

// Prefer the lighter renditions: tiny -> small -> medium.
function pickRendition(videos = {}) {
  return [videos.tiny, videos.small, videos.medium].find((v) => v?.url);
}

async function fetchCategory(category) {
  const params = new URLSearchParams({
    key: API_KEY,
    category,
    video_type: "film",
    safesearch: "true",
    order: "popular",
    per_page: String(Math.max(3, PER_CHANNEL)), // API accepts 3-200
  });

  const res = await fetch(`https://pixabay.com/api/videos/?${params}`);
  if (!res.ok)
    throw new Error(`Pixabay responded ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.hits ?? [];
}

const seen = new Set();
const items = [];

for (const { channel, category } of CHANNELS) {
  console.log(`Fetching "${category}" for @${channel}...`);
  const hits = await fetchCategory(category);

  let count = 0;
  for (const hit of hits) {
    if (count >= PER_CHANNEL) break;
    const rendition = pickRendition(hit.videos);
    if (!rendition || seen.has(hit.id)) continue;

    seen.add(hit.id);
    count += 1;
    items.push({
      pixabayId: hit.id,
      channel,
      category,
      title: toTitle(hit.tags),
      description: `Clip by ${hit.user} on Pixabay. Source: ${hit.pageURL}`,
      tags: hit.tags,
      duration: hit.duration,
      videoUrl: rendition.url,
      thumbnailUrl: rendition.thumbnail,
      width: rendition.width,
      height: rendition.height,
      sizeBytes: rendition.size,
      pixabayViews: hit.views,
      pixabayUser: hit.user,
      pageURL: hit.pageURL,
    });
  }

  await sleep(1500); // be gentle with the API
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 2)
);

const totalMB =
  items.reduce((sum, i) => sum + (i.sizeBytes || 0), 0) / 1024 / 1024;
console.log(
  `Saved ${items.length} videos (~${totalMB.toFixed(0)} MB combined) to ${OUT_FILE}`
);
