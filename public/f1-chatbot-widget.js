(function() {
  const CHATBOT_API_URL = 'https://f1-gpt-n2ii.vercel.app';
  
  const chatbotHTML = `
    <div id="f1-chatbot-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: Arial, sans-serif;">
      <div id="f1-chatbot-button" style="width: 60px; height: 60px; background: linear-gradient(135deg, #e10600, #ff6b00); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(225,6,0,0.4); transition: transform 0.2s;">
        <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      
      <div id="f1-chatbot-window" style="display: none; width: 350px; height: 500px; background: white; border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.3); position: absolute; bottom: 70px; right: 0; flex-direction: column;">
        <div style="background: linear-gradient(135deg, #e10600, #ff6b00); color: white; padding: 15px; border-radius: 10px 10px 0 0; font-weight: bold;">
          🏎️ F1 GPT Assistant
          <span id="f1-chatbot-close" style="float: right; cursor: pointer; font-size: 18px;">&times;</span>
        </div>
        
        <div id="f1-chatbot-messages" style="flex: 1; padding: 15px; overflow-y: auto; max-height: 350px;">
          <div style="background: #f1f1f1; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
            Hi! I'm your F1 GPT assistant. Ask me anything about Formula 1! 🏁
          </div>
        </div>
        
        <div style="padding: 15px; border-top: 1px solid #eee;">
          <div style="display: flex; gap: 10px;">
            <input id="f1-chatbot-input" type="text" placeholder="Ask about F1..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none;">
            <button id="f1-chatbot-send" style="background: linear-gradient(135deg, #e10600, #ff6b00); color: white; border: none; padding: 10px 15px; border-radius: 20px; cursor: pointer;">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function initF1Chatbot() {
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    
    const button = document.getElementById('f1-chatbot-button');
    const chatWindow = document.getElementById('f1-chatbot-window');
    const close = document.getElementById('f1-chatbot-close');
    const input = document.getElementById('f1-chatbot-input');
    const send = document.getElementById('f1-chatbot-send');
    const messages = document.getElementById('f1-chatbot-messages');
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
      chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
    });
    
    close.addEventListener('click', () => {
      chatWindow.style.display = 'none';
    });
    
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;
      
      addMessage(message, 'user');
      input.value = '';
      
      const loadingId = addMessage('🏎️ Thinking...', 'bot', true);
      
      try {
        const response = await fetch(`${CHATBOT_API_URL}/api/widget-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
          loadingElement.remove();
        }
        
        if (data.message) {
          addMessage(data.message, 'bot');
        } else if (data.error) {
          addMessage(`Error: ${data.error}`, 'bot');
        } else {
          addMessage('Sorry, I couldn\'t process your F1 question. Please try again! 🏁', 'bot');
        }
      } catch (error) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
          loadingElement.remove();
        }
        addMessage('Sorry, there was an error. Please try again later! 🔧', 'bot');
      }
    }
    
    function addMessage(text, sender, isLoading = false) {
      const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const isUser = sender === 'user';
      
      const messageDiv = document.createElement('div');
      messageDiv.id = messageId;
      messageDiv.style.cssText = `margin-bottom: 10px; text-align: ${isUser ? 'right' : 'left'};`;
      
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = `display: inline-block; max-width: 80%; padding: 10px; border-radius: 10px; background: ${isUser ? 'linear-gradient(135deg, #e10600, #ff6b00)' : '#f1f1f1'}; color: ${isUser ? 'white' : 'black'}; word-wrap: break-word;`;
      contentDiv.textContent = text;
      
      messageDiv.appendChild(contentDiv);
      messages.appendChild(messageDiv);
      messages.scrollTop = messages.scrollHeight;
      
      return messageId;
    }
    
    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initF1Chatbot);
  } else {
    initF1Chatbot();
  }
})();