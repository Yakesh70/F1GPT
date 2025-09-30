import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"
import OpenAI from "openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"

type similaritymetric = "dot_product" | "cosine" | "euclidean"

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY} = process.env

const openai = new OpenAI({apiKey: OPENAI_API_KEY})
const elanData = [
'https://elanenterprises.in/',
'https://elanenterprises.in/about',
'https://elanenterprises.in/about/',
'https://elanenterprises.in/contact',
'https://elanenterprises.in/contact/',
'https://elanenterprises.in/projects',
'https://elanenterprises.in/projects/',
'https://elanenterprises.in/renovation',
'https://elanenterprises.in/services',
'https://elanenterprises.in/services/',
'https://elanenterprises.in/services/',
'https://elanenterprises.in/services/'
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
    
    for await (const url of elanData){
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