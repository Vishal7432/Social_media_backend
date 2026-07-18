# 🌐 Social Media Backend

A scalable RESTful backend for a social media platform, built with **Node.js, Express.js, and MongoDB**. Implements secure JWT-based authentication, media uploads via Cloudinary, and a Twitter/YouTube-style **subscribe (follow) system** powered by MongoDB's aggregation framework.

<!-- Optional: add badges once deployed -->
<!-- ![Node.js](https://img.shields.io/badge/Node.js-18.x-green) ![Express](https://img.shields.io/badge/Express.js-4.x-black) ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen) -->

---

## 🚀 Overview

This project is the backend for an youtube/Twitter-style social platform, designed with an emphasis on clean, scalable architecture — controller-service separation, centralized error handling, and reusable middleware. It was built to deepen hands-on understanding of production-grade backend patterns (JWT refresh tokens, file uploads, complex MongoDB aggregation pipelines) rather than following a tutorial blindly — every route was implemented, tested, and debugged independently.

## ✨ Features

- **Authentication & Authorization** — Register/login with hashed passwords (bcrypt), access + refresh token flow using JWT, secure httpOnly cookies
- **File Uploads** — Avatar and cover image uploads handled via Multer + Cloudinary
- **Subscribe / Follow System** — Users can subscribe to other users' channels; subscriber and subscription counts computed in real time
- **Aggregation Pipelines** — Complex MongoDB pipelines (`$lookup`, `$addFields`, `$cond`) used to compute channel profile stats (subscriber count, subscription count, `isSubscribed` flag) in a single optimized query
- **Centralized Error Handling** — Custom `ApiError` and `ApiResponse` classes for consistent API responses
- **Async Handler Wrapper** — Clean controller code without repetitive try/catch blocks

## 🛠️ Tech Stack

| Layer        | Technology                            |
| ------------ | ------------------------------------- |
| Runtime      | Node.js                               |
| Framework    | Express.js                            |
| Database     | MongoDB with Mongoose ODM             |
| Auth         | JWT (access + refresh tokens), bcrypt |
| File Storage | Cloudinary + Multer                   |
| Dev Tools    | Prettier, dotenv                      |

### Data Models

Here you can see the Data Model:-

- [Model link](https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj)

## 📂 Project Structure

```
src/
├── controllers/    # Route handler logic
├── models/         # Mongoose schemas (User, Subscription, ...)
├── routes/         # API route definitions
├── middlewares/    # Auth, multer, error handling
├── utils/          # ApiError, ApiResponse, asyncHandler, cloudinary helper
├── db/             # MongoDB connection
└── app.js          # Express app configuration
```

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- Cloudinary account (for media uploads)

### Installation

```bash
git clone https://github.com/Vishal7432/Social_media_backend.git
cd Social_media_backend
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=*

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run Locally

```bash
npm run dev
```

Server will start on `http://localhost:8000`

## 📌 API Endpoints

**Base URL:** `/api/v1/users`

| Method | Endpoint           | Auth Required | Description                                                                                           |
| ------ | ------------------ | ------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/register`        | No            | Register a new user (with avatar + cover image upload)                                                |
| POST   | `/login`           | No            | Login user                                                                                            |
| POST   | `/logout`          | Yes           | Logout user, clear refresh token                                                                      |
| POST   | `/refresh-token`   | No            | Get a new access token using refresh token                                                            |
| POST   | `/change-password` | Yes           | Change current user's password                                                                        |
| GET    | `/current-user`    | Yes           | Get logged-in user's profile                                                                          |
| PATCH  | `/update-account`  | Yes           | Update account details (name, email)                                                                  |
| PATCH  | `/avatar`          | Yes           | Update avatar image                                                                                   |
| POST   | `/coverImage`      | Yes           | Update cover image                                                                                    |
| GET    | `/c/:username`     | Yes           | Get channel profile — subscriber count, subscription count, `isSubscribed` (via aggregation pipeline) |
| GET    | `/history`         | Yes           | Get watch/activity history                                                                            |

## 🧠 What I Learned

- Designing JWT access/refresh token flows and handling token rotation securely
- Writing multi-stage MongoDB aggregation pipelines to compute derived fields (`$lookup`, `$size`, `$cond`) without multiple round-trips to the database
- Structuring an Express backend for maintainability (separation of concerns across controllers, services, and utils)
- Debugging real production issues — e.g. resolving `ERR_MODULE_NOT_FOUND` in an ESM setup and fixing malformed MongoDB URIs

## 🗺️ Roadmap

- [ ] Posts / Tweets CRUD
- [ ] Comments & Likes
- [ ] Deploy to Render/Railway
- [ ] API documentation (Postman collection)

## 👤 Author

**Vishal Kumar Gupta**
Computer Science Graduate | MERN Stack Developer

- GitHub: [@Vishal7432](https://github.com/Vishal7432)
- LinkedIn: [vishal-gupta](https://linkedin.com/in/vishal-gupta)
- Email: vishalgupta110852@email.com

---

_⭐ If you found this project useful, consider giving it a star!_
