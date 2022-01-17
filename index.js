const express = require("express");
const app = express();
const errorMiddleware = require("./middleware/error");
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
var cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("kalalmi honda");
});
// environment file
const dotenv = require("dotenv");
const connectDB = require("./config/database");
dotenv.config();

//Handle Uncaught error

process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to unhandled Promise`);
  process.exit(1);
});

//Router

const productRoute = require("./routes/product");
const userRoute = require("./routes/user");
const orderRoute = require("./routes/order");
// mongodb connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then((data) => console.log(`Mongodb is connected  `));
// connectDB();

//Router
app.use("/api", productRoute);
app.use("/api", userRoute);
app.use("/api", orderRoute);

// Middleware for Error
app.use(errorMiddleware);

const server = app.listen(port, () => {
  console.log(`This server is running on ${port}`);
});

// Unhandled promise Rejection

process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to unhandled Promise`);
  server.close(() => {
    process.exit(1);
  });
});
