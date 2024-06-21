import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,  // One who is subscribing
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId,  // One to who the subcriber is subscribing
        ref: "User"
    }
}, {
    timestamps: true
})



export const subscription = mongoose.model("Subscription", subscriptionSchema)