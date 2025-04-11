document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.querySelector('.send-btn');
    const chatMessages = document.getElementById('chatMessages');

    const createMessageElement = (content, isUser) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = isUser ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        return messageDiv;
    };

    const scrollToBottom = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        chatMessages.appendChild(createMessageElement(message, true));
        scrollToBottom();
        chatInput.value = '';

        try {
            // Show loading state
            const loadingMessage = createMessageElement('Thinking...', false);
            chatMessages.appendChild(loadingMessage);
            scrollToBottom();

            const response = await axios.post('/api/chat', { message });
            
            // Replace loading message with actual response
            loadingMessage.querySelector('.message-content').textContent = response.data.message;
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message
            chatMessages.appendChild(createMessageElement('Sorry, there was an error processing your request.', false));
        }
        scrollToBottom();
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});
