const mongoose = require("mongoose");

const connectDB = () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then((data) => console.log(`Mongodb is connected  `));
};
module.exports = connectDB;
