const { Router } = require("express")
const { getQueries, deleteQuery } = require("../controllers/queryController")

const queryRouter = Router()

queryRouter.post("/data", getQueries)
queryRouter.delete("/delete/:id", deleteQuery)

module.exports = queryRouter