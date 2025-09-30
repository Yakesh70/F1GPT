import OpenAI from "openai"
import { DataAPIClient } from "@datastax/astra-db-ts"

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY
} = process.env

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE})

export async function POST(req: Request) {
  // Enable CORS for widget
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  try {
    const { message } = await req.json()
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { 
        status: 400, 
        headers 
      })
    }

    let docContext = ""

    // Get relevant data from vector database
    try {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message,
        encoding_format: "float"
      })

      const collection = await db.collection(ASTRA_DB_COLLECTION)
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 5
      })

      const documents = await cursor.toArray()
      console.log(`Found ${documents.length} documents for query: "${message}"`)
      const docsMap = documents?.map(doc => doc.text)
      docContext = docsMap.join('\n\n')
      console.log('Context preview:', docContext.substring(0, 500))
    } catch (err) {
      console.log("Error querying db:", err)
      docContext = ""
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant for Elan Enterprises construction company. You have access to information from their website.

Website Content:
${docContext || 'No specific content retrieved from database.'}

Based on the above website content, answer questions about Elan Enterprises. Extract and use any relevant information from the content to provide helpful answers about their services, projects, contact details, or company information. If the content contains relevant details, use them confidently in your response.`
        },
        {
          role: "user", 
          content: message
        }
      ]
    })

    return new Response(JSON.stringify({ 
      message: response.choices[0].message.content 
    }), {
      headers
    })
  } catch (error: any) {
    console.error('Widget API Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Sorry, I encountered an error. Please try again.' 
    }), { 
      status: 500,
      headers
    })
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}