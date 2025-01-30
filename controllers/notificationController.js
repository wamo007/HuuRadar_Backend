const fs = require('fs')
const path = require('path')
const Query = require('../models/query')
const User = require('../models/user')
const cron = require('node-cron')
const transporter = require('../config/nodeMailer')
const fundaScraper = require('./scrapers/funda')
const parariusScraper = require('./scrapers/pararius')
const rentolaScraper = require('./scrapers/rentola')
const hAnywhereScraper = require('./scrapers/hAnywhere')
const kamernetScraper = require('./scrapers/kamernet')
const huurwoningenScraper = require('./scrapers/huurwoningen')
const kamerNLScraper = require('./scrapers/kamerNL')

const saveQuery = async (req, res) => {
    try {
        const { name, email, city, radius, selectedProviders, sortGlobal, minPrice, maxPrice, responseData } = req.body
        
        if (!city || !responseData) {
            return res.json({
                error: 'Start the search first...'
            })
        }
        
        if (!email) {
            return res.json({
                error: 'Register or Login first!'
            })
        }

        const user = await User.findOne({ email })
        if (!user.accountVerified) {
            return res.json({
                error: 'Verify your account first!'
            })
        }

        const parsedData = JSON.parse(responseData)
        const queryData = []

        for (const provider in parsedData) {
            parsedData[provider].forEach((item) => {
                queryData.push({
                    provider,
                    link: item.link,
                    img: item.img,
                    heading: item.heading,
                    address: item.address,
                    price: item.price,
                    size: item.size,
                    seller: item.seller,
                    sellerLink: item.sellerLink,
                })
            })
        }

        const query = new Query({
            name,
            email,
            providers: selectedProviders,
            city,
            radius,
            sortGlobal,
            minPrice,
            maxPrice,
            queryData,
        })

        await query.save()

        return res.json({ success: true, message: 'Successfully saved!' })
    } catch (error) {
        if (error.code === 11000) {
            return res.json({
                error: 'You have already added the task with these search parameters.'
            })
        }
        console.log('Something went wrong...', error.message)
    }
}

const scrapers = {
    funda: fundaScraper,
    hAnywhere: hAnywhereScraper,
    pararius: parariusScraper,
    rentola: rentolaScraper,
    kamernet: kamernetScraper,
    kamerNL: kamerNLScraper,
    huurwoningen: huurwoningenScraper,
}

const compareQuery = async () => {
    try{
        const queries = await Query.find({})

        for (const query of queries) {
            const { city, radius, providers, sortGlobal, minPrice, maxPrice } = query
            let updatedData = []
            
            for (const providerId of providers) {
                const scraper = scrapers[providerId]
                const data = await scraper(city, radius, sortGlobal, minPrice, maxPrice)
                updatedData = [...updatedData, ...data]
            }

            const newEntries = updatedData.filter(
                (newEntry) => !query.queryData.some((oldEntry) => oldEntry.heading === newEntry.heading)
            )

            const removedEntries = query.queryData.filter(
                (oldEntry) => !updatedData.some((newEntry) => newEntry.heading === oldEntry.heading)
            )

            // const updatedEntries = updatedData.filter((newEntry) => {
            //     const oldEntry = query.queryData.find((oldEntry) => oldEntry.link === newEntry.link)
            //     return oldEntry && !_.isEqual(oldEntry, newEntry)
            // })

            // console.log('New entries: ', newEntries)
            // console.log('Removed entries: ', removedEntries)
            // console.log('Updated entries: ', updatedEntries)

            if (newEntries.length) {
                try {
                    const emailNewEntriesTemplatePath = path.join(__dirname, '../config', 'NewEntries.html')
                    let emailNewEntriesTemplate = fs.readFileSync(emailNewEntriesTemplatePath, 'utf-8')

                    const mailEntries = newEntries.map((entry) => {
                        return `
                            <div style="padding: 10px; margin-bottom: 20px; border-radius: 10px; background-color: whitesmoke;">
                              <a href="${entry.link}">
                                <img src="${entry.img.split(' ')[0]}" alt="${entry.heading}" style="width: 180px; height: 120px; border-radius: 10px; object-fit: cover;">
                              </a>
                              <div>
                                <a href="${entry.link}" style="text-decoration: none; color: black;">
                                  <h2 style="margin-bottom: 7px;">${entry.heading}</h2>
                                  <h3 style="margin: 0;">${entry.address}</h3>
                                </a>
                                <div>
                                  <h3 style="text-decoration: none; color: black;">${entry.price}</h3>
                                  <h4 style="text-decoration: none; color: black;">Size: ${entry.size}</h4>
                                  <a href="${entry.sellerLink}" style="text-decoration: none; color: black;">
                                      Seller: ${entry.seller}
                                  </a>
                                  <p style="font-size: 12px;">Provider: ${entry.provider.charAt(0).toUpperCase() + entry.provider.slice(1)}</p>
                                </div>
                              </div>
                            </div>
                        `
                    }).join(''); // to convert it all to a string for the template entry
                    
                    emailNewEntriesTemplate = emailNewEntriesTemplate
                        .replace('{{name}}', query.name)
                        .replace(/{{#newEntries}}[\s\S]*?{{\/newEntries}}/, mailEntries)
                    console.log('Processed HTML:', emailNewEntriesTemplate)
    
                    const mailOptions = {
                        from: process.env.SENDER_EMAIL,
                        to: query.email,
                        subject: 'New listings avaiable!',
                        html: emailNewEntriesTemplate,
                        attachments: [
                            {
                                filename: 'logo.png',
                                path: path.join(__dirname, '../public/assets/logo.png'),
                                cid: 'logo',
                            },
                            {
                                filename: 'bg_email.png',
                                path: path.join(__dirname, '../public/assets/bg_email.png'),
                                cid: 'bg_email',
                            },
                            {
                                filename: 'github-original.png',
                                path: path.join(__dirname, '../public/assets/github-original.png'),
                                cid: 'github',
                            },
                            {
                                filename: 'linkedin-plain.png',
                                path: path.join(__dirname, '../public/assets/linkedin-plain.png'),
                                cid: 'linkedin',
                            }
                        ]
                    }
                
                    await transporter.sendMail(mailOptions)
                } catch (error) {
                    console.error('Email error: ', error.message)
                }

                await Query.findOneAndUpdate(
                    { _id: query._id },
                    {
                      $set: { queryData: updatedData },
                    },
                    { new: true }
                )
                console.log(`Query updated for email: ${query.email}. ID: ${query._id}`)
            } else {
                console.log(`No changes for query: ${query._id}`);
            }
        }
    } catch (error) {
        console.log('Error occured, trying again. Error: ', error.message)
        try {
            const queries = await Query.find({})

            for (const query of queries) {
                const { city, radius, providers, sortGlobal, minPrice, maxPrice } = query
                let updatedData = []
                
                for (const providerId of providers) {
                    const scraper = scrapers[providerId]
                    const data = await scraper(city, radius, sortGlobal, minPrice, maxPrice)
                    updatedData = [...updatedData, ...data]
                }

                const newEntries = updatedData.filter(
                    (newEntry) => !query.queryData.some((oldEntry) => oldEntry.heading === newEntry.heading)
                )

                const removedEntries = query.queryData.filter(
                    (oldEntry) => !updatedData.some((newEntry) => newEntry.heading === oldEntry.heading)
                )

                // const updatedEntries = updatedData.filter((newEntry) => {
                //     const oldEntry = query.queryData.find((oldEntry) => oldEntry.link === newEntry.link)
                //     return oldEntry && !_.isEqual(oldEntry, newEntry)
                // })

                // console.log('New entries: ', newEntries)
                // console.log('Removed entries: ', removedEntries)
                // console.log('Updated entries: ', updatedEntries)

                if (newEntries.length) {
                    try {
                        const emailNewEntriesTemplatePath = path.join(__dirname, '../config', 'NewEntries.html')
                        let emailNewEntriesTemplate = fs.readFileSync(emailNewEntriesTemplatePath, 'utf-8')

                        const mailEntries = newEntries.map((entry) => {
                            return `
                                <div style="padding: 10px; margin-bottom: 20px; border-radius: 10px; background-color: whitesmoke;">
                                <a href="${entry.link}">
                                    <img src="${entry.img.split(' ')[0]}" alt="${entry.heading}" style="width: 180px; height: 120px; border-radius: 10px; object-fit: cover;">
                                </a>
                                <div>
                                    <a href="${entry.link}" style="text-decoration: none; color: black;">
                                    <h2 style="margin-bottom: 7px;">${entry.heading}</h2>
                                    <h3 style="margin: 0;">${entry.address}</h3>
                                    </a>
                                    <div>
                                    <h3 style="text-decoration: none; color: black;">${entry.price}</h3>
                                    <h4 style="text-decoration: none; color: black;">Size: ${entry.size}</h4>
                                    <a href="${entry.sellerLink}" style="text-decoration: none; color: black;">
                                        Seller: ${entry.seller}
                                    </a>
                                    <p style="font-size: 12px;">Provider: ${entry.provider.charAt(0).toUpperCase() + entry.provider.slice(1)}</p>
                                    </div>
                                </div>
                                </div>
                            `
                        }).join(''); // to convert it all to a string for the template entry
                        
                        emailNewEntriesTemplate = emailNewEntriesTemplate
                            .replace('{{name}}', query.name)
                            .replace(/{{#newEntries}}[\s\S]*?{{\/newEntries}}/, mailEntries)
                        console.log('Processed HTML:', emailNewEntriesTemplate)
        
                        const mailOptions = {
                            from: process.env.SENDER_EMAIL,
                            to: query.email,
                            subject: 'New listings avaiable!',
                            html: emailNewEntriesTemplate,
                            attachments: [
                                {
                                    filename: 'logo.png',
                                    path: path.join(__dirname, '../public/assets/logo.png'),
                                    cid: 'logo',
                                },
                                {
                                    filename: 'bg_email.png',
                                    path: path.join(__dirname, '../public/assets/bg_email.png'),
                                    cid: 'bg_email',
                                },
                                {
                                    filename: 'github-original.png',
                                    path: path.join(__dirname, '../public/assets/github-original.png'),
                                    cid: 'github',
                                },
                                {
                                    filename: 'linkedin-plain.png',
                                    path: path.join(__dirname, '../public/assets/linkedin-plain.png'),
                                    cid: 'linkedin',
                                }
                            ]
                        }
                    
                        await transporter.sendMail(mailOptions)
                    } catch (error) {
                        console.error('Email error: ', error.message)
                    }

                    await Query.findOneAndUpdate(
                        { _id: query._id },
                        {
                        $set: { queryData: updatedData },
                        },
                        { new: true }
                    )
                    console.log(`Query updated for email: ${query.email}. ID: ${query._id}`)
                } else {
                    console.log(`No changes for query: ${query._id}`);
                }
            }
        } catch (error) {
            console.error('Error occured: ', error.message)
        }
    }
}

// compareQuery()

// cron.schedule('*/30 * * * *', compareQuery)

module.exports = saveQuery