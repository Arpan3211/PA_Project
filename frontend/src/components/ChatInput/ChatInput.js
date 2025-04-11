document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const chatForm = document.getElementById('chatForm');
    const sendBtn = document.querySelector('.send-btn');
    const chatMessages = document.getElementById('chatMessages');
    const welcomeSection = document.querySelector('.welcome-section');
    const newChatBtn = document.querySelector('.new-chat-btn');

    // API base URL
    const API_BASE_URL = 'http://localhost:8000/api/v1';
    console.log('Using API base URL:', API_BASE_URL);

    // Auto-resize textarea
    const resizeTextarea = () => {
        // Reset height to auto to get the correct scrollHeight
        chatInput.style.height = 'auto';
        // Set the height to match content (with a max height constraint handled by CSS)
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    };

    // Initialize textarea height
    resizeTextarea();

    // Listen for input events to resize textarea
    chatInput.addEventListener('input', resizeTextarea);

    // Simple markdown-like formatting for code blocks
    const formatMessage = (content) => {
        // Replace code blocks with proper HTML
        let formatted = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        // Replace newlines with <br> tags
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    };

    // Function to create a message element
    const createMessageElement = (content, isUser) => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isUser ? 'user' : 'assistant'}`;

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.innerHTML = isUser ? content : formatMessage(content);

        messageElement.appendChild(contentElement);
        return messageElement;
    };

    // Function to scroll chat to bottom
    const scrollToBottom = () => {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('login.html') &&
        !window.location.pathname.includes('register.html')) {
        window.location.href = 'login.html';
    }

    const sendMessage = async (e) => {
        console.log('Send message function called');
        // Prevent any form submission that might be causing page reload
        if (e) e.preventDefault();

        const message = chatInput.value.trim();
        if (!message) return;

        // Hide welcome section if visible
        if (welcomeSection && welcomeSection.style.display !== 'none') {
            welcomeSection.style.display = 'none';
        }

        // Add user message to UI immediately
        const userMessageElement = createMessageElement(message, true);
        chatMessages.appendChild(userMessageElement);
        scrollToBottom();

        // Clear input and reset height
        chatInput.value = '';
        resizeTextarea();

        // Focus back on input
        chatInput.focus();

        try {
            // Show loading state with typing animation
            const loadingMessage = createMessageElement('Thinking<span class="typing-animation">...</span>', false);
            chatMessages.appendChild(loadingMessage);
            scrollToBottom();

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found, redirecting to login');
                window.location.href = 'login.html';
                return;
            }

            // Get conversation ID from URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const conversationId = urlParams.get('conversation_id') || localStorage.getItem('conversation_id') || null;
            console.log('Sending with conversation ID:', conversationId);

            try {
                // Make API request to send message
                const response = await axios.post(`${API_BASE_URL}/chat/`, {
                    message: message,
                    conversation_id: conversationId ? parseInt(conversationId) : null
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('API response:', response.data);

                if (!response.data) {
                    throw new Error('Empty response from server');
                }

                // Replace loading message with actual response
                const responseContent = response.data.message || 'I\'m not sure how to respond to that.';
                loadingMessage.querySelector('.message-content').innerHTML = formatMessage(responseContent);

                // Save conversation ID for future messages
                if (response.data.conversation_id) {
                    const newConversationId = response.data.conversation_id;
                    const isNewConversation = !conversationId || parseInt(conversationId) !== newConversationId;

                    // Store conversation ID in localStorage
                    localStorage.setItem('conversation_id', newConversationId);
                    console.log('Received conversation ID:', newConversationId);

                    // Update URL with conversation ID
                    const url = new URL(window.location.href);
                    url.searchParams.set('conversation_id', newConversationId);
                    window.history.pushState({}, '', url);

                    // Only refresh conversation list if this is a new conversation
                    if (isNewConversation) {
                        console.log('New conversation created, updating sidebar');
                        // This will trigger a refresh of the conversation list without reloading conversations
                        window.dispatchEvent(new CustomEvent('conversationCreated', {
                            detail: {
                                id: newConversationId,
                                title: message.length > 30 ? message.substring(0, 27) + '...' : message
                            }
                        }));
                    }

                    // Store that we're currently viewing this conversation
                    localStorage.setItem('currentlyViewingConversation', newConversationId);

                    // Add a flag to prevent unnecessary reloading
                    sessionStorage.setItem('preventNextReload', 'true');
                } else {
                    console.error('No conversation ID received from server');
                }
            } catch (innerError) {
                console.error('Error in API response handling:', innerError);
                console.error('Error details:', innerError.response ? innerError.response.data : 'No response data');
                loadingMessage.querySelector('.message-content').innerHTML = 'Error processing response from server.';
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message
            chatMessages.appendChild(createMessageElement('Sorry, there was an error processing your request.', false));
        }
        scrollToBottom();
    };

    // We've removed the conversationUpdated event listener as it was causing page flickering
    // Now we're using the more efficient conversationCreated event instead

    // Function to create a new conversation
    const createNewConversation = () => {
        console.log('Creating new conversation');

        // Clear conversation IDs from localStorage
        localStorage.removeItem('conversation_id');
        localStorage.removeItem('currentlyViewingConversation');

        // Clear chat messages
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }

        // Show welcome section
        if (welcomeSection) {
            welcomeSection.style.display = 'flex';
        }

        // Update URL to remove conversation_id parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('conversation_id');
        window.history.pushState({}, '', url);

        // Focus on the chat input
        if (chatInput) {
            chatInput.focus();
        }
    };

    // Handle orientation change on mobile devices
    window.addEventListener('orientationchange', () => {
        // Wait for the orientation change to complete
        setTimeout(() => {
            // Adjust scroll position
            scrollToBottom();
            // Recalculate textarea height
            resizeTextarea();
        }, 300);
    });

    // Load conversation history if available
    const loadConversationHistory = async () => {
        // Check if we should prevent reloading
        if (sessionStorage.getItem('preventNextReload') === 'true') {
            console.log('Preventing unnecessary reload of conversation history');
            sessionStorage.removeItem('preventNextReload');
            return;
        }

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Get conversation ID from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation_id') || localStorage.getItem('conversation_id');

        console.log('Loading conversation history for ID:', conversationId);

        if (conversationId) {
            try {
                // Store that we're currently viewing this conversation
                localStorage.setItem('currentlyViewingConversation', conversationId);

                // Make API request to get conversation history
                const response = await axios.get(`${API_BASE_URL}/chat/history/${conversationId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('Conversation history response:', response.data);

                if (response.data && response.data.messages && response.data.messages.length > 0) {
                    // Hide welcome section
                    if (welcomeSection) {
                        welcomeSection.style.display = 'none';
                    }

                    // Clear existing messages
                    chatMessages.innerHTML = '';

                    // Add messages to chat
                    response.data.messages.forEach(msg => {
                        const isUser = msg.role === 'user';
                        chatMessages.appendChild(createMessageElement(msg.content, isUser));
                    });

                    scrollToBottom();
                } else {
                    console.log('No messages found for conversation ID:', conversationId);
                    // If no messages, show welcome section
                    if (welcomeSection) {
                        welcomeSection.style.display = 'flex';
                    }
                }
            } catch (error) {
                console.error('Error loading conversation history:', error);
                console.error('Error details:', error.response ? error.response.data : 'No response data');

                // If there's an error, start a new conversation
                createNewConversation();

                // Remove the problematic conversation ID
                localStorage.removeItem('conversation_id');
                localStorage.removeItem('currentlyViewingConversation');

                // Show an error message to the user
                if (chatMessages) {
                    chatMessages.innerHTML = '<div class="error-message">Error loading conversation. Starting a new chat.</div>';
                }
            }
        } else {
            console.log('No conversation ID found, showing welcome section');
            // If no conversation ID, show welcome section
            if (welcomeSection) {
                welcomeSection.style.display = 'flex';
            }

            // Clear any existing messages
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
        }
    };

    // Event listeners
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage(e);
    });

    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage(e);
    });

    chatInput.addEventListener('keydown', (e) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default to avoid new line
            sendMessage(e);
        }
    });

    // Focus input on page load (but not on mobile to avoid keyboard popup)
    if (window.innerWidth > 768) {
        chatInput.focus();
    }

    // Add event listener for New Chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('New Chat button clicked');

            // Set flag to prevent unnecessary reloads
            sessionStorage.setItem('preventNextReload', 'true');

            createNewConversation();
        });
    }

    // Load conversation history on page load, but only if this is a fresh page load
    const pageLoadCount = parseInt(sessionStorage.getItem('pageLoadCount') || '0');
    if (pageLoadCount <= 1) {
        // This is a fresh page load, not a reload
        loadConversationHistory();
    } else {
        console.log('Skipping loadConversationHistory on page reload');
    }
});
