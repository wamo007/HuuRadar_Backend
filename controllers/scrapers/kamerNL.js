const { getBrowser } = require('./masterScraper')
const KAMERNL_URL = 'https://www.kamer.nl'

const requestHeaders = {
    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    Referer: 'https://www.google.com/',
}

const kamerNLScraper  = async (city, radius, sortGlobal, minPrice, maxPrice) => {

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ ...requestHeaders })

    let data
    let queries
    let initialUrl
    let kamerNLData = []
    let currentPage = 1

    function radiusKamerNL(radiusChosen) {
        const options = {
            '0': '1',
            '1': '1',
            '5': '5',
            '10': '10',
        }
        return options[radiusChosen.toLowerCase()] ?? 'Radius type unknown... How???'
    }

    function sortKamerNL(sortingChosen) {
        const options = {
            'new': '-created',
            'old': 'created',
            'cheap': 'rental_price',
            'pricy': '-rental_price',
        }
        return options[sortingChosen.toLowerCase()] ?? 'Sorting type unknown... How???'
    }

    function minPriceKamerNL(minPriceChosen) {
        let minPrice = parseInt(minPriceChosen)
        return Math.round(minPrice/100)*100
    }

    function maxPriceKamerNL(maxPriceChosen) {
        let maxPrice = parseInt(maxPriceChosen)
        return Math.round(maxPrice/100)*100
    }

    if (!minPrice && !maxPrice) {
        queries = `/en/rent/?q=${city}&type=&created=3&distance=${radiusKamerNL(radius)}&sort=${sortKamerNL(sortGlobal)}&min_price=${minPriceKamerNL(minPrice)}&max_price=${maxPriceKamerNL(maxPrice)}`
    } else if (!minPrice && maxPrice) {
        queries = `/en/rent/?q=${city}&type=&created=3&distance=${radiusKamerNL(radius)}&sort=${sortKamerNL(sortGlobal)}&max_price=${maxPriceKamerNL(maxPrice)}`
    } else if (minPrice && !maxPrice) {
        queries = `/en/rent/?q=${city}&type=&created=3&distance=${radiusKamerNL(radius)}&sort=${sortKamerNL(sortGlobal)}&min_price=${minPriceKamerNL(minPrice)}`
    } else if (minPrice > maxPrice) {
        queries = `/en/rent/?q=${city}&type=&created=3&distance=${radiusKamerNL(radius)}&sort=${sortKamerNL(sortGlobal)}&max_price=${maxPriceKamerNL(maxPrice)}`
    } else {
        queries = `/en/rent/?q=${city}&type=&created=3&distance=${radiusKamerNL(radius)}&sort=${sortKamerNL(sortGlobal)}&min_price=${minPriceKamerNL(minPrice)}&max_price=${maxPriceKamerNL(maxPrice)}`
    }

    initialUrl = `${KAMERNL_URL}${queries}`

    try {
        await page.goto(initialUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        })
    } catch (error) {
        try {
            await page.goto(initialUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            })
        } catch (error) {
            console.error(`Navigation to ${initialUrl} failed:`, err.message);
            await page.close()
            return kamerNL
        }
    }

    let maxPage = await page.evaluate(() => {
        const totalPages = Array.from(document.querySelectorAll('div.justify-end.space-x-2>div>*'))
            .map((page) => {
                return (page && (page.textContent !== '')) ? parseInt(page.textContent, 10) : NaN
            })
            .filter((num) => !isNaN(num))
        console.log(totalPages)
        return (totalPages.length > 0) ? Math.max(...totalPages) : 1
    })
    
    while (currentPage <= maxPage) {

        await autoScroll(page)

        data = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(
              'div.search-results-list div.relative.group'
              )).map((div) => {
                const link = div.querySelector("a").getAttribute('href')
                const img = div.querySelector("img")?.getAttribute('src') || ''
                const heading = div.querySelector("div.flex>div>div>p.overflow-hidden").textContent.trim()
                const address = div.querySelector("div.flex>div>p.text-blue-800")?.textContent.trim() || ''
                const price = div.querySelector('div.flex>div>div>p.flex-none').textContent.trim()
                const size = div.querySelector('div.flex>div:nth-child(2)>div>p')?.textContent.trim() || ''
                const seller = div.querySelector('div.flex-col>p')?.textContent.trim() || ''

                return {
                    link: `https://www.kamer.nl${link}`,
                    img,
                    heading,
                    address,
                    price,
                    size,
                    seller,
                    sellerLink: `https://www.kamer.nl${link}`
                }
            })
        })
        kamerNLData.push(...data)
        currentPage++
    }
    await page.close()
    return kamerNLData
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0
            const distance = 600
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight
                window.scrollBy(0, distance)
                totalHeight += distance

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer)
                    resolve()
                }
            }, 100)
        })
    })
}

module.exports = kamerNLScraper