const { getBrowser } = require('./masterScraper')
const FUNDA_URL = `https://www.funda.nl/en/`

const requestHeaders = {
    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    Referer: 'https://www.google.com/',
}

const fundaScraper = async (city, radius, sortGlobal, minPrice, maxPrice) => {

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ ...requestHeaders })
    
    let data
    let initialUrl
    let fundaData = []
    let currentPage = 1

    function sortFunda(sortingChosen = 'new') {
        const options = {
            'new': 'date_down',
            'old': 'date_up',
            'cheap': 'price_up',
            'pricy': 'price_down',
        }
        return options[sortingChosen.toLowerCase()] ?? 'date_down'
    }

    if (!minPrice && !maxPrice) {
        initialUrl = `${FUNDA_URL}zoeken/huur?selected_area=%5B"${city.toLowerCase()},${radius}km"%5D&sort="${sortFunda(sortGlobal)}&publication_date="3"&object_type=%5B"apartment","house"%5D`
    } else {
        initialUrl = `${FUNDA_URL}zoeken/huur?selected_area=%5B"${city.toLowerCase()},${radius}km"%5D&sort="${sortFunda(sortGlobal)}"&publication_date="3"&price="${minPrice}-${maxPrice}"&object_type=%5B"apartment","house"%5D`
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
            return fundaData
        }
    }  

    let maxPage = await page.evaluate(() => {
        const totalPages = Array.from(document.querySelectorAll('a[href*="?page="]'))
            .map((a) => {
                return a ? parseInt(a.textContent.trim(), 10) : NaN
            })
            .filter((num) => !isNaN(num))
        console.log(totalPages)
        return (totalPages.length > 0) ? Math.max(...totalPages) : 1
    })
        
    while (currentPage <= maxPage) {
        const changingUrl = `${initialUrl}&search_result=${currentPage}`
        await page.goto(changingUrl, {
            waitUntil: 'domcontentloaded'
        })

        try {
            const content = await page.$('div.pt-4 div[data-test-id="search-result-item"]')
            if (content) {
                data = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(
                      'div.pt-4 div[data-test-id="search-result-item"]'
                      )).map((div) => {
                        const link = div.querySelector("a").getAttribute('href')
                        const img = div.querySelector("img")?.getAttribute('srcset') || ''
                        const heading = div.querySelector("h2").textContent.trim()
                        const address = div.querySelector('div[data-test-id="postal-code-city"]').textContent.trim()
                        const price = div.querySelector('p[data-test-id="price-rent"]').textContent.trim()
                        const size = div.querySelector('li.flex')?.textContent.trim() || ''
                        const seller = div.querySelector('div.mt-4 a')?.textContent.trim() || ''
                        const sellerLink = div.querySelector('div.mt-4 a')?.getAttribute('href') || ''
                    
                        let filterPrice = ''
                    
                        if (price.length < 10) {
                            filterPrice = 'Price On Request'
                        } else {
                            filterPrice = price
                        }
                    
                        return {
                            provider: 'funda',
                            link,
                            img,
                            heading,
                            address,
                            price: filterPrice,
                            size,
                            seller,
                            sellerLink
                        }
                    })
                })
            } else {
                data = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(
                      'div.border-b.pb-3>div.flex-col'
                      )).map((div) => {
                        const link = div.querySelector("a").getAttribute('href')
                        const img = div.querySelector("img")?.getAttribute('srcset') || ''
                        const heading = div.querySelector("a span").textContent.trim()
                        const address = div.querySelector('a>div.truncate').textContent.trim()
                        const price = div.querySelector('div.font-semibold>div.truncate:last-child').textContent.trim()
                        const size = div.querySelector('li.flex')?.textContent.trim() || ''
                        const seller = div.querySelector('div.mr-2 a')?.textContent.trim() || ''
                        const sellerLink = div.querySelector('div.mr-2 a')?.getAttribute('href') || ''
                    
                        let filterPrice = ''

                        if (price.length < 10) {
                            filterPrice = 'Price On Request'
                        } else {
                            filterPrice = price
                        }

                        return {
                            provider: 'funda',
                            link: `https://www.funda.nl/en${link}`,
                            img,
                            heading,
                            address,
                            price: `${filterPrice.substring(0, filterPrice.length - 6)} p/mo`,
                            size,
                            seller: `Seller: ${seller}`,
                            sellerLink
                        }
                    })
                })
            }
            fundaData.push(...data)
        } catch (error) {
            console.log('Funda did not give anything, skipping it...')
        }
        currentPage++
    }

    await page.close()
    return fundaData
}

module.exports = fundaScraper