const { Router } = require('express')
const transporter = require('../config/nodeMailer')
const feedbackRouter = Router()

feedbackRouter.post('/', async (req, res) => {
    try {
        const { name, email, text } = req.body

        if (!name) {
            return res.json({
                error: 'Name is required.'
            })
        }

        if (!text) {
            return res.json({
                error: 'Text is required.'
            })
        }

        if (!email) {
            return res.json({
                error: 'Enter your valid e-mail.'
            })
        }

        const mailOptions = {
            from: process.env.SUPPORT_EMAIL,
            to: 'shamo.iskandarov@gmail.com',
            subject: `${name} (${email})`,
            text: text,
        }

        await transporter.sendMail(mailOptions)

        return res.json({ success: true, message: `Your request was successfully submitted!` })

    } catch (err) {
        res.json({
            message: err.message
        })
    }
})

module.exports = feedbackRouter