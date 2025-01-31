const Query = require("../models/query")

// Fetch all queries for the logged-in user
const getQueries = async (req, res) => {
    try {
        const { email } = req.body

        const queries = await Query.find({ email })

        res.json({ success: true, queries })
    } catch (error) {
        res.json({ error: error.message })
    }
}

// Delete a query by ID
const deleteQuery = async (req, res) => {
    try {
        const { id } = req.params
        await Query.findByIdAndDelete(id)
        res.json({ success: true, message: "Query deleted successfully!" })
    } catch (error) {
        res.json({ error: error.message })
    }
}

module.exports = {
    getQueries,
    deleteQuery,
}