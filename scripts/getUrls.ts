import { DataAPIClient } from "@datastax/astra-db-ts"
import "dotenv/config"

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

const getUniqueUrls = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)
    
    // Get all documents with distinct URLs
    const cursor = collection.find({}, { projection: { url: 1 } })
    const documents = await cursor.toArray()
    
    // Get unique URLs
    const uniqueUrls = [...new Set(documents.map(doc => doc.url))]
    
    console.log(`\n🔗 Found ${uniqueUrls.length} unique scraped URLs:\n`)
    uniqueUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`)
    })
}

getUniqueUrls().catch(console.error)