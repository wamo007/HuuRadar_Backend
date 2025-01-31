const axios = require('axios')

const workerServers = [
    { url: 'http://localhost:3001/extractor', scrapers: ['funda'] },
    { url: 'http://localhost:3002/extractor', scrapers: ['hAnywhere'] },
    { url: 'http://localhost:3003/extractor', scrapers: ['kamernet'] },
    { url: 'http://localhost:3004/extractor', scrapers: ['kamerNL'] },
    { url: 'http://localhost:3005/extractor', scrapers: ['pararius'] },
    { url: 'http://localhost:3006/extractor', scrapers: ['huurwoningen'] },
    { url: 'http://localhost:3007/extractor', scrapers: ['rentola'] },
]

const scrapeController = async (req, res) => {
    const { city, radius, selectedProviders, sortGlobal, minPrice, maxPrice } = req.body

    if (!city) {
        return res.status(400)
        .send({ error: 'Please, provide information about the city.' })
    }

    // console.log(`Processing the request for ${city}, ${radius} km, ${selectedProviders}, ${sortGlobal}, ${minPrice} - ${maxPrice}. Time: ${new Date()}`)

    res.setHeader('Content-Type', 'application/json')

    try {
        let completedProviders = 0
        const totalProviders = workerServers.reduce((acc, worker) => {
            const scrapersToRun = worker.scrapers.filter(scraper => selectedProviders.includes(scraper))
            return acc + (scrapersToRun.length > 0 ? 1 : 0)
        }, 0)

        workerServers.forEach(worker => {
            const scrapersToRun = worker.scrapers.filter(scraper => selectedProviders.includes(scraper))
            if (scrapersToRun.length > 0) {
                axios.post(worker.url, {
                    scrapers: scrapersToRun,
                    city,
                    radius,
                    sortGlobal,
                    minPrice,
                    maxPrice,
                }).then(workerResponse => {
                    res.write(JSON.stringify(workerResponse.data) + '\n')
                    completedProviders++
                    if (completedProviders === totalProviders) {
                        res.end()
                        // console.log(`Time of completion for ${city} - ${new Date()}`)
                    }
                })
            }
        })
    } catch (error) {
        console.error('Error finding information on the websites:', error)
        res.status(500)
        .json({ success: false, error: 'Failed to find info on the websites.' })
    }
}

module.exports = scrapeController