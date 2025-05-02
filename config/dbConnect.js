const mongoose = require("mongoose");

const dbConnect = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URL);
         // Set mongoose to use the global promise library
        console.log("Connected to MongoDB");
    }catch(error){
      console.log("Error connecting to MongoDB:", error.message);
    };
};

module.exports = dbConnect;
