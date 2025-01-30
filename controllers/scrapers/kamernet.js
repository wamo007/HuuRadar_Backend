const { getBrowser } = require('./masterScraper')
const KAMERNET_URL = 'https://kamernet.nl'

const requestHeaders = {
    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    Referer: 'https://www.google.com/',
}

const kamernetScraper  = async (city, radius, sortGlobal, minPrice, maxPrice) => {

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ ...requestHeaders })

    let data
    let initialUrl
    let kamernetData = []

    function radiusKamernet(radiusChosen = '0') {
        const options = {
            '0': '1',
            '1': '2',
            '5': '4',
            '10': '5',
        }
        return options[radiusChosen] ?? '1'
    }

    function sortKamernet(sortingChosen = 'new') {
        const options = {
            'new': '1',
            'old': '1',
            'cheap': '2',
            'pricy': '4',
        }
        return options[sortingChosen.toLowerCase()] ?? '1'
    }

    function maxPriceKamernet(maxPriceChosen) {
        let maxPrice = parseInt(maxPriceChosen)
        if (maxPrice <= 1500) {
            return Math.round(maxPrice/100)
        } else {
            let leftover = Math.round((maxPrice - 1500)/250)
            return 15 + leftover
        }
    }

    initialUrl = `${KAMERNET_URL}/en/for-rent/properties-${city}?searchview=1&maxRent=${maxPriceKamernet(maxPrice)}&radius=${radiusKamernet(radius)}&pageNo=1&sort=${sortKamernet(sortGlobal)}`

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
            return kamernetData
        }
    }  
    
    while (true) {

        let nextBtn = await page.evaluate(() => {
            return document.querySelector('button[aria-label="Go to next page"]')?.disabled || ''
        })
        let newIcon = await page.evaluate(() => {
            return document.querySelector('div[class^="GridGenerator_root"] a span.MuiChip-label')?.textContent.trim() || ''
        })

        data = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(
              'div[class^="GridGenerator_root"] a'
              )).map((a) => {
                const img = a.querySelector("img")?.getAttribute('src') || ''
                const furnished = a.querySelector('div.MuiCardContent-root>div:nth-child(2)>p:nth-child(2)')?.textContent.trim() || ''
                const propertyType = a.querySelector('div.MuiCardContent-root>div:nth-child(2)>p:nth-child(3)')?.textContent.trim() || ''
                const address = a.querySelector('div.MuiCardContent-root>div>span')?.textContent.trim() || ''
                const cityAddress = a.querySelector('div.MuiCardContent-root>div>span:last-child')?.textContent.trim() || ''
                const dateAvailable = a.querySelector('div.MuiCardContent-root>p')?.textContent.trim() || ''
                const price = a.querySelector('div.MuiCardContent-root>div:last-child>span')?.textContent.trim() || ''
                const bills = a.querySelector('div.MuiCardContent-root>div:last-child>p')?.textContent.trim() || ''
                const size = a.querySelector('div.MuiCardContent-root>div:nth-child(2)>p:nth-child(1)')?.textContent.trim() || ''
                
                let filterPrice = `${price.substring(0, 1)} ${price.substring(1, price.length)}`

                return {
                    provider: 'kamernet',
                    link: a.href,
                    img,
                    heading: `${propertyType}, ${furnished}`,
                    address: `${address} ${cityAddress}`,
                    price: `${filterPrice} p/mo ${bills.split(' ').slice(1, 3).join(' ')}`,
                    size,
                    seller: dateAvailable,
                    sellerLink: a.href
                }
            })
        })

        kamernetData.push(...data)
        
        if (nextBtn === true) {
            break
        } else {
            await page.waitForSelector('button[aria-label="Go to next page"]')
            await page.click('button[aria-label="Go to next page"]')
        }

        if (newIcon === '') {
            break
        }
    }
    await page.close()
    return kamernetData
}

module.exports = kamernetScraper