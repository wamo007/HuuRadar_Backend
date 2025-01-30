const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    verifyOtp: {
        type: String,
        default: ''
    },
    verifyOtpExpires: {
        type: Number,
        default: 0
    },
    accountVerified: {
        type: Boolean,
        default: false
    },
    resetOtp: {
        type: String,
        default: ''
    },
    resetOtpExpires: {
        type: Number,
        default: 0
    },
})

const UserModel = mongoose.models.user || mongoose.model('User', userSchema)

module.exports = UserModel