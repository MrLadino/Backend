// errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error("Error stack:", err.stack);
  
    const statusCode = err.statusCode || 500;
    const response = {
      message: process.env.NODE_ENV === "development" ? err.message : "Algo salió mal en el servidor",
    };
  
    if (process.env.NODE_ENV === "development") {
      response.stack = err.stack;
    }
  
    res.status(statusCode).json(response);
  };
  
  module.exports = errorHandler;
  