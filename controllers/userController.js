const UserModel = require('../models/user')

const getUserData = async (req, res) => {
    try {
        const { userId } = req.body

        const user = await UserModel.findById(userId)

        if (!user) {
            return res.json({
                error: 'User not found!'
            })
        }

        res.json({
            success: true,
            userData: {
                name: user.name,
                accountVerified: user.accountVerified,
                email: user.email,
            }
        })

    } catch (err) {
        res.json({
            message: err.message
        })
    }
}

module.exports = getUserData