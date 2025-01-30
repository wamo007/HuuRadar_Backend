const { getBrowser } = require('./masterScraper')
const HUURWONINGEN_URL = 'https://www.huurwoningen.nl'

const huurwoningenScraper  = async (city, radius, sortGlobal, minPrice, maxPrice) => {

    const browser = await getBrowser()
    const page = await browser.newPage()

    let data
    let initialUrl
    let huurwoningenData = []
    let currentPage = 1

    function sortHuurwoningen(sortingChosen = 'new') {
        const options = {
            'new': 'published_at&direction=desc',
            'old': 'published_at&direction=desc',
            'cheap': 'price&direction=asc',
            'pricy': 'price&direction=desc',
        }
        return options[sortingChosen.toLowerCase()] ?? 'published_at&direction=desc'
    }

    if (!minPrice && !maxPrice) {
        minPrice = '0'
        maxPrice = '60000'
        initialUrl = `${HUURWONINGEN_URL}/in/${city}/?price=${minPrice}-${maxPrice}&since=3&sort=${sortHuurwoningen(sortGlobal)}`
    } else if (!minPrice) {
        minPrice = '0'
        initialUrl = `${HUURWONINGEN_URL}/in/${city}/?price=${minPrice}-${maxPrice}&since=3&sort=${sortHuurwoningen(sortGlobal)}`
    } else if (!maxPrice || maxPrice === 0) {
        maxPrice = '60000'
        initialUrl = `${HUURWONINGEN_URL}/in/${city}/?price=${minPrice}-${maxPrice}&since=3&sort=${sortHuurwoningen(sortGlobal)}`
    } else {
        initialUrl = `${HUURWONINGEN_URL}/in/${city}/?price=${minPrice}-${maxPrice}&since=3&sort=${sortHuurwoningen(sortGlobal)}`
    }

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
            return huurwoningenData
        }
    }   

    let maxPage = await page.evaluate(() => {
        const totalPages = Array.from(document.querySelectorAll('ul.pagination__list li a'))
            .map((a) => {
                return a ? parseInt(a.textContent.trim(), 10) : NaN
            })
            .filter((num) => !isNaN(num))
        return (totalPages.length > 0) ? Math.max(...totalPages) : 1
    })
        
    while (currentPage <= maxPage) {
        const changingUrl = `${initialUrl}&page=${currentPage}`
        await page.goto(changingUrl, {
            waitUntil: 'domcontentloaded'
        })

        await autoScroll(page)

        data = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(
              'ul.search-list li.search-list__item--listing section'
              )).map((section) => {
                const link = section.querySelector("a.listing-search-item__link").getAttribute('href')
                const img = section.querySelector("picture img")?.getAttribute('src') || ''
                const heading = section.querySelector("h2.listing-search-item__title a").textContent.trim()
                const address = section.querySelector('div[class^="listing-search-item__sub-title"]').textContent.trim()
                const price = section.querySelector('div.listing-search-item__price').textContent.trim()
                const size = section.querySelector('li.illustrated-features__item.illustrated-features__item--surface-area')?.textContent.trim() || ''

                let filterPrice = ''

                if (isNaN(parseFloat(price.substring(1, price.length - 10)))) {
                    filterPrice = 'Price On Request'
                } else {
                    filterPrice = `${price.substring(0, 1)} ${price.substring(1, price.length - 10)} p/mo.`
                }

                return {
                    provider: 'huurwoningen',
                    link: `https://www.huurwoningen.nl${link}`,
                    img,
                    heading,
                    address,
                    price: filterPrice,
                    size,
                    seller: 'No info',
                    sellerLink: `https://www.huurwoningen.nl${link}`
                }
            })
        })

        huurwoningenData.push(...data)
        currentPage++
    }
    await page.close()
    return huurwoningenData
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0
            const distance = 380
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight
                window.scrollBy(0, distance)
                totalHeight += distance

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer)
                    resolve()
                }
            }, 120)
        })
    })
}

module.exports = huurwoningenScraper