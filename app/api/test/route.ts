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
  try {
    const { messages } = await req.json()
    const latestMessage = messages[messages?.length - 1]?.content

    let docContext = ""

    // Get relevant F1 data from vector database
    try {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: latestMessage,
        encoding_format: "float"
      })

      const collection = await db.collection(ASTRA_DB_COLLECTION)
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 15
      })

      const documents = await cursor.toArray()
      const docsMap = documents?.map(doc => doc.text)
      docContext = JSON.stringify(docsMap)
      
      console.log(`Found ${documents.length} relevant documents`)
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
          content: `You are an expert Formula One assistant with access to comprehensive F1 data.

Use the context below to answer questions. If the context contains relevant information, use it confidently. If the context mentions partial information (like race wins, championship scenarios), combine it with your F1 knowledge to provide complete answers.

For example:
- If context shows Verstappen winning multiple 2023 races and championship scenarios, you can confidently state he won the 2023 championship
- If context shows salary/contract information, use it to answer about highest paid drivers

Be confident and provide complete answers when you have sufficient information.

--------------------------------------------------
CONTEXT:
${docContext}
--------------------------------------------------

QUESTION: ${latestMessage}`
        },
        ...messages
      ]
    })

    return new Response(JSON.stringify({ 
      message: response.choices[0].message.content 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}