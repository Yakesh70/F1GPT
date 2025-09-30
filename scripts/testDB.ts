import { DataAPIClient } from "@datastax/astra-db-ts"
import "dotenv/config"

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, {namespace: ASTRA_DB_NAMESPACE})

async function testDatabase() {
    try {
        const collection = await db.collection(ASTRA_DB_COLLECTION)
        
        // Get Elan documents
        const elanDocs = await collection.find({"url": "https://elanenterprises.in/"}, {limit: 3}).toArray()
        console.log(`Found ${elanDocs.length} Elan documents`)
        
        // Get all documents sample
        const allDocs = await collection.find({}, {limit: 5}).toArray()
        console.log(`Total sample documents: ${allDocs.length}`)
        if (elanDocs.length > 0) {
            console.log('\nElan documents found:')
            elanDocs.forEach((doc, i) => {
                console.log(`\nElan Document ${i + 1}:`)
                console.log(`URL: ${doc.url}`)
                console.log(`Text preview: ${doc.text?.substring(0, 300)}...`)
            })
        } else {
            console.log('No Elan documents found!')
        }
        
        console.log('\nAll documents sample:')
        allDocs.forEach((doc, i) => {
            console.log(`\nDocument ${i + 1}: ${doc.url}`)
        })
        
    } catch (error) {
        console.error('Database test error:', error)
    }
}

testDatabase()