const express = require('express')
const dotenv = require('dotenv').config()
const cors = require('cors')
const { mongoose } = require('mongoose')
const scrapeRouter = require('./routes/scrapeRoutes')
const authRouter = require('./routes/authRoutes')
const userRouter = require('./routes/userRoutes')
const feedbackRouter = require('./routes/feedbackRoutes')
const cookieParser = require('cookie-parser')
const path = require('path')
const queryRouter = require('./routes/queryRoutes')

const corsOptions = {
    credentials: true,
    origin: 'https://huuradar.org',
}

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Database connected'))
    .catch(() => console.log('Database not connected', err))

const app = express()
const PORT = 8089

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ parameterLimit: 100000, limit: '50mb', extended: true }))

app.use('/api', scrapeRouter)
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/api/query', queryRouter)
app.use('/api/feedback', feedbackRouter)

app.listen(PORT, () => {
    console.log(`HuuRadar - listening on port ${PORT}!`);
})