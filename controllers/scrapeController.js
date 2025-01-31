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
        return res.status(400).send({ error: 'Please, provide information about the city.' })
    }

    res.setHeader('Content-Type', 'application/json')

    try {
        const activeWorkers = workerServers.filter(worker =>
            worker.scrapers.some(scraper => selectedProviders.includes(scraper))
        )

        // Create an array of promises for all active workers
        const workerPromises = activeWorkers.map(worker =>
            axios.post(worker.url, {
                scrapers: worker.scrapers.filter(scraper => selectedProviders.includes(scraper)),
                city,
                radius,
                sortGlobal,
                minPrice,
                maxPrice,
            })
        )

        // allSettled to handle all worker requests not sequentially but concurrently
        const results = await Promise.allSettled(workerPromises)

        // then res.write as soon as available
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                res.write(JSON.stringify(result.value.data) + '\n')
            } else {
                console.error('Worker failed:', result.reason)
            }
        })

        res.end()
    } catch (error) {
        console.error('Error finding information on the websites:', error)
        res.status(500).json({ success: false, error: 'Failed to find info on the websites.' })
    }
}

module.exports = scrapeController