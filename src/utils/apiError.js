class ApiError extends Error {
  constructor(
    statusCode,
    message = "An unexpected error occurred",
    error = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;  // You can set this to any relevant data you want to include with the error 
    this.message = message;
    this.error = error;
    this.stack = stack;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export default ApiError;
