(function() {
    'use strict';
    
    // Prevent multiple widget loads
    if (window.ElanChatWidget) return;
    
    // Configuration
    const CONFIG = {
        API_URL: 'https://f1-gpt-n2ii.vercel.app/api/widget-chat',
        WIDGET_ID: 'elan-chat-widget',
        PRIMARY_COLOR: '#e10600',
        SECONDARY_COLOR: '#ff4444'
    };
    
    // Widget HTML
    const WIDGET_HTML = `
        <div id="${CONFIG.WIDGET_ID}" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <!-- Chat Bubble -->
            <div id="elan-chat-bubble" style="
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, ${CONFIG.PRIMARY_COLOR}, ${CONFIG.SECONDARY_COLOR});
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(225, 6, 0, 0.3);
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <span style="color: white; font-size: 24px;">🏢</span>
            </div>
            
            <!-- Chat Window -->
            <div id="elan-chat-window" style="
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 350px;
                height: 450px;
                background: white;
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, ${CONFIG.PRIMARY_COLOR}, ${CONFIG.SECONDARY_COLOR});
                    color: white;
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <div style="font-weight: bold; font-size: 16px;">🏢 Elan Enterprises</div>
                        <div style="font-size: 12px; opacity: 0.9;">Ask me anything!</div>
                    </div>
                    <button id="elan-close-chat" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 5px;
                    ">×</button>
                </div>
                
                <!-- Messages -->
                <div id="elan-chat-messages" style="
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    background: #f8f9fa;
                ">
                    <div style="
                        background: white;
                        padding: 10px;
                        border-radius: 10px;
                        margin-bottom: 10px;
                        border-left: 3px solid ${CONFIG.PRIMARY_COLOR};
                    ">
                        👋 Hi! I'm here to help you learn about Elan Enterprises. Ask me about our services, projects, or contact information!
                    </div>
                </div>
                
                <!-- Input -->
                <div style="
                    padding: 15px;
                    border-top: 1px solid #eee;
                    background: white;
                ">
                    <div style="display: flex; gap: 10px;">
                        <input id="elan-chat-input" type="text" placeholder="Ask about Elan Enterprises..." style="
                            flex: 1;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 20px;
                            outline: none;
                            font-size: 14px;
                        ">
                        <button id="elan-send-message" style="
                            background: ${CONFIG.PRIMARY_COLOR};
                            color: white;
                            border: none;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            cursor: pointer;
                            font-size: 16px;
                        ">🚀</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Widget Class
    class ElanChatWidget {
        constructor() {
            this.isOpen = false;
            this.messages = [];
            this.init();
        }
        
        init() {
            // Create widget container
            const container = document.createElement('div');
            container.innerHTML = WIDGET_HTML;
            document.body.appendChild(container);
            
            // Get elements
            this.bubble = document.getElementById('elan-chat-bubble');
            this.window = document.getElementById('elan-chat-window');
            this.messages_container = document.getElementById('elan-chat-messages');
            this.input = document.getElementById('elan-chat-input');
            this.sendBtn = document.getElementById('elan-send-message');
            this.closeBtn = document.getElementById('elan-close-chat');
            
            // Bind events
            this.bindEvents();
            
            console.log('🏢 Elan Enterprises Widget loaded successfully!');
        }
        
        bindEvents() {
            // Toggle chat
            this.bubble.addEventListener('click', () => this.toggleChat());
            this.closeBtn.addEventListener('click', () => this.closeChat());
            
            // Send message
            this.sendBtn.addEventListener('click', () => this.sendMessage());
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        
        toggleChat() {
            this.isOpen = !this.isOpen;
            this.window.style.display = this.isOpen ? 'flex' : 'none';
            if (this.isOpen) {
                this.input.focus();
            }
        }
        
        closeChat() {
            this.isOpen = false;
            this.window.style.display = 'none';
        }
        
        async sendMessage() {
            const message = this.input.value.trim();
            if (!message) return;
            
            // Add user message
            this.addMessage(message, 'user');
            this.input.value = '';
            
            // Show typing indicator
            this.addTypingIndicator();
            
            try {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                
                // Remove typing indicator
                this.removeTypingIndicator();
                
                if (data.error) {
                    this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                } else {
                    this.addMessage(data.message, 'bot');
                }
            } catch (error) {
                this.removeTypingIndicator();
                this.addMessage('Sorry, I could not connect. Please try again later.', 'bot');
                console.error('Elan Widget Error:', error);
            }
        }
        
        addMessage(text, sender) {
            const isUser = sender === 'user';
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                background: ${isUser ? CONFIG.PRIMARY_COLOR : 'white'};
                color: ${isUser ? 'white' : '#333'};
                padding: 10px 15px;
                border-radius: 15px;
                margin-bottom: 10px;
                max-width: 80%;
                margin-left: ${isUser ? 'auto' : '0'};
                margin-right: ${isUser ? '0' : 'auto'};
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.4;
                ${!isUser ? 'border-left: 3px solid ' + CONFIG.PRIMARY_COLOR + ';' : ''}
            `;
            messageDiv.textContent = text;
            
            this.messages_container.appendChild(messageDiv);
            this.messages_container.scrollTop = this.messages_container.scrollHeight;
        }
        
        addTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.id = 'elan-typing-indicator';
            typingDiv.style.cssText = `
                background: white;
                padding: 10px 15px;
                border-radius: 15px;
                margin-bottom: 10px;
                max-width: 80%;
                border-left: 3px solid ${CONFIG.PRIMARY_COLOR};
                font-size: 14px;
                color: #666;
                font-style: italic;
            `;
            typingDiv.textContent = 'Elan Assistant is typing...';
            
            this.messages_container.appendChild(typingDiv);
            this.messages_container.scrollTop = this.messages_container.scrollHeight;
        }
        
        removeTypingIndicator() {
            const typing = document.getElementById('elan-typing-indicator');
            if (typing) typing.remove();
        }
    }
    
    // Initialize widget when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ElanChatWidget = new ElanChatWidget();
        });
    } else {
        window.ElanChatWidget = new ElanChatWidget();
    }
})();