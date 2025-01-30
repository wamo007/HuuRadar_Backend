const fundaScraper = require('./scrapers/funda')
const hAnywhereScraper = require('./scrapers/hAnywhere')
const parariusScraper = require('./scrapers/pararius')
const rentolaScraper = require('./scrapers/rentola')
const kamernetScraper = require('./scrapers/kamernet')
const huurwoningenScraper = require('./scrapers/huurwoningen')
const kamerNLScraper = require('./scrapers/kamerNL')

const sortProviders = ['funda', 'hAnywhere', 'kamernet', 'kamerNL', 'pararius', 'huurwoningen', 'rentola']

const scrapeController = async (req, res) => {
    const city = req.body.city
    const radius = req.body.radius
    const selectedProviders = req.body.selectedProviders
    const sortGlobal = req.body.sortGlobal
    const minPrice = req.body.minPrice
    const maxPrice = req.body.maxPrice

    if (!city) {
        return res.status(400)
        .send({ error: 'Please, provide information about the city.' })
    }

    const scrapers = {
        funda: fundaScraper,
        hAnywhere: hAnywhereScraper,
        kamernet: kamernetScraper,
        kamerNL: kamerNLScraper,
        pararius: parariusScraper,
        huurwoningen: huurwoningenScraper,
        rentola: rentolaScraper,
    }

    console.log(`Processing the request for ${city}, ${radius} km, ${selectedProviders.sort((a, b) => sortProviders.indexOf(a) - sortProviders.indexOf(b))}, ${sortGlobal}, ${minPrice} - ${maxPrice}. Time: ${new Date()}`)

    res.setHeader('Content-Type', 'application/json')

    try {
        for (const providerId of selectedProviders) {
            const scraper = scrapers[providerId]
            const data = await scraper(city, radius, sortGlobal, minPrice, maxPrice)
            res.write(JSON.stringify({ [providerId]: data }) + '\n')
        }

        res.end()

        console.log(`The request for ${city} has been completed on ${new Date()}`)
    } catch (error) {
        console.error('Error finding information on the websites:', error)
        res.status(500)
        .json({ success: false, error: 'Failed to find info on the websites.' })
    }
}

module.exports = scrapeController