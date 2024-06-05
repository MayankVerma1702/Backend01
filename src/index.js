// require('dotenv').config()

import dotenv from "dotenv"


import express from "express"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
    })

connectDB()











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