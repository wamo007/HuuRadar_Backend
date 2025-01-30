const jwt = require('jsonwebtoken')

const userAuth = async (req, res, next) => {
    const { token } = req.cookies
    
    if (!token) {
        return res.json({
            error: 'Not authorized. Please login again'
        })
    }
    
    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)

        if (tokenDecode.id) {
            req.body.userId = tokenDecode.id
        } else {
            return res.json({
                error: 'Not authorized. Please login again'
            })
        }

        next()
    } catch (err) {
        res.json({
            message: err.message
        })
    }
}

module.exports = userAuth