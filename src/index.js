// require('dotenv').config()

import dotenv from "dotenv"



import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
    })

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running on port${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed!!", err);
})











/*
const app = express()
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        application.on("error", (error) => {
            console.log("Err :", error)
            throw error
        })

        application.listen(process.env.PORT, () => {
            console.log(`App is listning on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR: ", error)
    }
})()

*/