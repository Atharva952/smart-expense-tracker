export const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const errorHandler = (error, req, res, next) => {
  console.log("Error", error);

  return res.status(error.code || 500).json({
    success: false,
    message: error.message || "Something went wrong",
  });
};

export default errorHandler;
