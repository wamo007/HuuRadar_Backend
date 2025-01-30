const { getBrowser } = require('./masterScraper')
const RENTOLA_URL = `https://www.rentola.nl/en`

const rentolaScraper = async (city, radius, sortGlobal, minPrice, maxPrice) => {

    const browser = await getBrowser()
    const page = await browser.newPage()

    let data
    let initialUrl
    let rentolaData = []
    let currentPage = 1

    if (city === 'den-haag') city = 'the-hague'

    function sortRentola(sortingChosen = 'new') {
        const options = {
            'new': 'desc',
            'old': 'asc',
            'cheap': 'rent_asc',
            'pricy': 'rent_desc',
        }
        return options[sortingChosen.toLowerCase()] ?? 'desc'
    }

    if (!minPrice && !maxPrice) {
        initialUrl = `${RENTOLA_URL}/rent?location=${city}&order=${sortRentola(sortGlobal)}`
    } else if (!minPrice) {
        minPrice = '0'
        initialUrl = `${RENTOLA_URL}/rent?location=${city}&order=${sortRentola(sortGlobal)}&rent=${minPrice}-${maxPrice}`
    } else if (!maxPrice || maxPrice === 0) {
        maxPrice = '60000'
        initialUrl = `${RENTOLA_URL}/rent?location=${city}&order=${sortRentola(sortGlobal)}&rent=${minPrice}-${maxPrice}`
    } else {
        initialUrl = `${RENTOLA_URL}/rent?location=${city}&order=${sortRentola(sortGlobal)}&rent=${minPrice}-${maxPrice}`
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
            return rentolaData
        }
    }  

    let maxPage = await page.evaluate(() => {
        return document.querySelector('div[aria-label="Pagination"]>div a:last-child')?.textContent.trim() || '1'
    })

    while (currentPage <= maxPage) {
        let newIcon = await page.evaluate(() => {
            return document.querySelector('div[aria-roledescription="slide"]>div.absolute.right-4')?.textContent.trim() || ''
        })

        const changingUrl = `${initialUrl}&page=${currentPage}`
        await page.goto(changingUrl, {
            waitUntil: 'domcontentloaded'
        })

        await autoScroll(page)
        
        data = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(
            'ul div[data-testid="propertyTile"]'
            )).map((div) => {
                const link = div.querySelector("a").getAttribute('href')
                const img = div.querySelector("img")?.getAttribute('src') || ''
                const heading = div.querySelector("p").textContent.trim()
                const address = div.querySelector("div.mb-4 p.line-clamp-3").textContent.trim()
                const price = div.querySelector('div.p-4 div.mb-2 p.text-xl').textContent.trim()
                const size = div.querySelector('span.mr-1')?.textContent.trim() || ''
        
                return {
                    provider: 'rentola',
                    link: `https://www.rentola.nl${link}`,
                    img,
                    heading,
                    address,
                    price: `${price.split(' ').slice(1, 2).join(' ')} ${price.split(' ').slice(0, 1).join(' ')} p/mo.`,
                    size: `${size} m²`,
                    seller: 'Rentola',
                    sellerLink: `https://www.rentola.nl${link}`
                }
            })
        })

        rentolaData.push(...data)

        if (newIcon !== 'New!') {
            break
        }

        currentPage++
    }

    await page.close()
    return rentolaData
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0
            const distance = 300
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight
                window.scrollBy(0, distance)
                totalHeight += distance

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer)
                    resolve()
                }
            }, 150)
        })
    })
}

module.exports = rentolaScraper