import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCLoudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user  = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token!")
    }
}

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

const loginUser = asyncHandler(async(req,res) => {
    // req.body -> data
    // username or email
    // find the user
    // if user found check the password
    // if password is correct generate access and refresh token
    // send cookie containg token

    const {email, username, password} = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if(!user)
        throw new ApiError(404, "User does not exixts!")

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid)
        throw new ApiError(404, "Invalid user credentials")

    const {accessToken, refreshToken} =  await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // Now sending cookie
    const options = {
        hhtpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken

            },
            "User Logged in successfully"
        )
        )
})

const logoutUser = asyncHandler( async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler( async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or Used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newrefreshToken},
                "Access Token refreshed"
            )
        )
        } catch (err) {
            throw new ApiError(400, err?.message || "Invalid refresh token")
        }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
    .status(200)
    .json(200, req.user, "Current User fetched Successfully")

})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname, email} = await req.body

    if(!(fullname || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated successfully"))
})

const updateUserAvtar = asyncHandler(async(req,res) => {
    const avtarLocalPath = req.file?.path

    if(!avtarLocalPath){
        throw new ApiError(400, "Avtar file is missing")
    }

    const avtar =await uploadOnCLoudinary(avtarLocalPath)
    if(!avtar.url){
        throw new ApiError(400, "Error while uploading avtar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avtar: avtar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avtar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const CoverLocalPath = req.file?.path

    if(!CoverLocalPath){
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage =await uploadOnCLoudinary(CoverLocalPath)
    if(!acoverImage.url){
        throw new ApiError(400, "Error while uploading Cover Image")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    )
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvtar, updateUserCoverImage}