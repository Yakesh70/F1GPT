import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"
import OpenAI from "openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"

type similaritymetric = "dot_product" | "cosine" | "euclidean"

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY} = process.env

const openai = new OpenAI({apiKey: OPENAI_API_KEY})
const f1Data = [
'https://en.wikipedia.org/wiki/Formula_One',
'https://www.skysports.com/f1/news/12433/13117256/lewis-hamilton-says-move-to-ferrari-from-mercedes-doesn-t-need-vindicating-and-',
'https://www.formula1.com/en/latest/all',
'https://www.forbes.com/sites/brettknight/2023/11/29/formula-1s-highest-paid-drivers-2023/?sh=12bdb942463f',
'https://www.autosport.com/f1/news/history-of-female-f1-drivers-including-grand-prix-starters-and-test-drivers/10584871/',
'https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship',
'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship',
'https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions',
'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
'https://www.formula1.com/en/results.html/2024/races.html',
'https://www.formula1.com/en/racing/2024.html'
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, {namespace: ASTRA_DB_NAMESPACE})

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap:100
})

const createCollection = async(similaritymetric: similaritymetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536,
                metric: similaritymetric
            }
        })
        console.log(res)
    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            console.log('Collection already exists, continuing...')
        } else {
            throw error
        }
    }
}

const loadsampledata = async() => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)
    
    for await (const url of f1Data){
        console.log(`Processing ${url}...`)
        
        // Check if URL already exists
        const existing = await collection.findOne({ url: url })
        if (existing) {
            console.log(`⏭️  Skipping ${url} - already processed`)
            continue
        }
        
        try {
            const content = await scrapepage(url)
            const chunks = await splitter.splitText(content)
            let i = 0
            
            for await (const chunk of chunks) {
                try {
                    const embedding = await openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: chunk,
                        encoding_format: "float"
                    })

                    const vector = embedding.data[0].embedding
                    
                    // Retry logic for database insertion
                    let retries = 3
                    while (retries > 0) {
                        try {
                            await collection.insertOne({
                                $vector: vector,
                                text: chunk,
                                url: url
                            })
                            break
                        } catch (error: any) {
                            retries--
                            if (retries === 0) throw error
                            console.log(`Retrying insertion... (${3 - retries}/3)`)
                            await new Promise(resolve => setTimeout(resolve, 2000))
                        }
                    }
                    i++
                    
                    // Add delay between insertions to prevent overload
                    await new Promise(resolve => setTimeout(resolve, 200))
                } catch (error) {
                    console.error(`Error processing chunk: ${error}`)
                    continue
                }
            }
            console.log(`✅ Inserted ${i} chunks for ${url}`)
        } catch (error) {
            console.error(`❌ Failed to process ${url}: ${error}`)
            continue
        }
    }
    console.log('🎉 Seeding complete!')
}

const scrapepage= async (url: string) =>{
    const loader = new PuppeteerWebBaseLoader(url,{
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser ) =>{
           const result= await page.evaluate(()=> document.body.innerHTML)
           await browser.close()
           return result
        }
    })
    return (await loader.load())[0]?.pageContent?.replace(/<[^>]*>?/gm, '') || ''
}

createCollection().then(()=> loadsampledata())