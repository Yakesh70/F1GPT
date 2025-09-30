import "./global.css"
import Script from "next/script"

export const metadata = {
  title: "F1GPT",
  description: "The place to go for all your Formula One questions!"
}

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/f1-chatbot-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}

export default RootLayout