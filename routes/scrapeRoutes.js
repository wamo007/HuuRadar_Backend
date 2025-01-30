const { Router } = require('express')
const scrapeRouter = Router()
const scrapeController = require('../controllers/scrapeController')
const saveQuery = require('../controllers/notificationController')

scrapeRouter.get('/', (req, res) => {
    res.send('API works!')
})

scrapeRouter.post('/', scrapeController)
scrapeRouter.post('/save-query', saveQuery)

module.exports = scrapeRouter