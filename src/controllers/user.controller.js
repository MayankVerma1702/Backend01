import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCLoudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - fields should not be empty and other validation of formats if required
    // check if user already existed: username and email
    // check for image and check for avtar
    // upload them to cloudinary , avtar
    // create user object- create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {email, username, fullname, password} = req.body

    // console.log("email", email);

    if ([email,fullname,username,password].some( (field) => field?.trim() ==="" ) ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]              // Check for the availability of any one of username or email in the database
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already existed")
    }

    const avtarLocalPath = req.files?.avtar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; this will give error when we donot pass coverImage

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avtarLocalPath){
        throw new ApiError(400, "Avtar is required!!")
    }

    const avtar= await uploadOnCLoudinary(avtarLocalPath)
    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)

    if(!avtar){
        throw new ApiError(400, "Avtar is reqired")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        avtar: avtar.url,
        coverImage: coverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

} )

export {registerUser}