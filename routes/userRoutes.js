const { Router } = require('express')
const userAuth = require('../middleware/userAuth')
const getUserData = require('../controllers/userController')

const userRouter = Router()

userRouter.get('/data', userAuth, getUserData)

module.exports = userRouter