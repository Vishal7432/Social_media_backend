const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
};

export default asyncHandler;

// cosnt asyncHandler = () => {}
// cosnt asyncHandler = (fn) => () => {}
// cosnt asyncHandler = (fn) => async () => {}

// const asyncHandler = (fn) => async (res, req, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res
//       .status(error.statusCode || 500)
//       .json({ success: false, message: error.message });
//   }
// };
