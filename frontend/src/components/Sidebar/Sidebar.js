document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000/api/v1';
    const menuToggle = document.querySelector('.menu-toggle');
    const floatingMenuToggle = document.querySelector('.floating-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const logo = document.querySelector('.logo');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const conversationList = document.getElementById('conversationList');
    const usernameElement = document.getElementById('username');
    const logoutBtn = document.getElementById('logoutBtn');

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

    // Function to toggle sidebar
    const toggleSidebar = () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');

            // Force recalculation of chat input position
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));

                // Get the chat input container
                const chatInputContainer = document.querySelector('.chat-input-container');
                if (chatInputContainer) {
                    // Force a repaint to ensure the transform is applied correctly
                    chatInputContainer.style.display = 'none';
                    setTimeout(() => {
                        chatInputContainer.style.display = 'flex';
                    }, 10);
                }
            }, 300);
        }
    };

    // Function to get user info
    const getUserInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update username in sidebar
            if (usernameElement) {
                usernameElement.textContent = response.data.username;
            }

            return response.data;
        } catch (error) {
            console.error('Error getting user info:', error);
            // If unauthorized, redirect to login
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            return null;
        }
    };

    // Function to load conversation history
    const loadConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Show loading state
            if (conversationList) {
                conversationList.innerHTML = '<div class="loading-conversations">Loading conversations...</div>';
            }

            const response = await axios.get(`${API_BASE_URL}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (conversationList) {
                // Clear loading state
                conversationList.innerHTML = '';

                if (response.data.conversations.length === 0) {
                    conversationList.innerHTML = '<div class="loading-conversations">No conversations yet</div>';
                    return;
                }

                // Get current conversation ID from URL or localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const currentConversationId = urlParams.get('conversation_id') || localStorage.getItem('conversation_id');

                // Add conversations to the list
                response.data.conversations.forEach(conv => {
                    const item = document.createElement('div');
                    item.className = `conversation-item${currentConversationId === conv.id ? ' active' : ''}`;
                    item.dataset.id = conv.id;
                    item.innerHTML = `
                        <span class="conversation-icon">💬</span>
                        <span class="conversation-title">${conv.title}</span>
                    `;

                    // Add click event to load conversation
                    item.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Check if we're already viewing this conversation
                        const currentConversationId = localStorage.getItem('currentlyViewingConversation');
                        if (currentConversationId === String(conv.id)) {
                            console.log('Already viewing this conversation, no need to reload');
                            return;
                        }

                        console.log('Switching to conversation:', conv.id);

                        // Set flag to prevent unnecessary reloads
                        sessionStorage.setItem('preventNextReload', 'true');

                        // Update URL with conversation ID
                        const url = new URL(window.location.href);
                        url.searchParams.set('conversation_id', conv.id);
                        window.history.pushState({}, '', url);

                        // Store conversation ID in localStorage
                        localStorage.setItem('conversation_id', String(conv.id));

                        // Update active state
                        document.querySelectorAll('.conversation-item').forEach(el => {
                            el.classList.remove('active');
                        });
                        item.classList.add('active');

                        // Load conversation messages without page refresh
                        loadConversationMessages(String(conv.id));
                    });

                    conversationList.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            if (conversationList) {
                conversationList.innerHTML = '<div class="loading-conversations">Error loading conversations</div>';
            }
        }
    };

    // Function to load conversation messages
    const loadConversationMessages = async (conversationId) => {
        try {
            // Check if we should prevent reloading
            if (sessionStorage.getItem('preventNextReload') === 'true') {
                console.log('Preventing unnecessary reload of conversation messages');
                sessionStorage.removeItem('preventNextReload');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found, redirecting to login');
                window.location.href = 'login.html';
                return;
            }

            const chatMessages = document.getElementById('chatMessages');
            const welcomeSection = document.querySelector('.welcome-section');

            // Check if we're already viewing this conversation
            const currentConversationId = localStorage.getItem('currentlyViewingConversation');
            if (currentConversationId === conversationId && chatMessages.children.length > 0 &&
                !chatMessages.querySelector('.loading-message') &&
                !chatMessages.querySelector('.error-message')) {
                // We're already viewing this conversation, no need to reload
                console.log('Already viewing conversation', conversationId);
                return;
            }

            console.log('Loading conversation', conversationId);

            // Store the conversation we're currently viewing
            localStorage.setItem('currentlyViewingConversation', conversationId);

            // Store conversation ID in localStorage
            localStorage.setItem('conversation_id', conversationId);

            // Show loading state
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="loading-message">Loading messages...</div>';

                // Hide welcome section
                if (welcomeSection) {
                    welcomeSection.style.display = 'none';
                }
            }

            console.log('Loading conversation history with token:', token ? 'Token exists' : 'No token');

            const response = await axios.get(`${API_BASE_URL}/chat/history/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Conversation history response:', response.data);

            if (chatMessages) {
                // Clear loading state
                chatMessages.innerHTML = '';

                if (response.data && response.data.messages && response.data.messages.length > 0) {
                    // Add messages to chat
                    response.data.messages.forEach(msg => {
                        const isUser = msg.role === 'user';
                        const messageElement = document.createElement('div');
                        messageElement.className = `message ${isUser ? 'user' : 'assistant'}`;

                        const contentElement = document.createElement('div');
                        contentElement.className = 'message-content';
                        contentElement.innerHTML = isUser ? msg.content : formatMessage(msg.content);

                        messageElement.appendChild(contentElement);
                        chatMessages.appendChild(messageElement);
                    });

                    // Scroll to bottom
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else {
                    console.log('No messages found for conversation ID:', conversationId);
                    // If no messages, show welcome section
                    if (welcomeSection) {
                        welcomeSection.style.display = 'flex';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading conversation messages:', error);
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="error-message">Error loading messages</div>';
            }
        }
    };

    // Toggle sidebar collapse with menu button
    menuToggle.addEventListener('click', toggleSidebar);

    // Toggle sidebar with floating menu button
    floatingMenuToggle.addEventListener('click', toggleSidebar);

    // Handle new chat button click
    if (newChatBtn) {
        newChatBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Set flag to prevent unnecessary reloads
            sessionStorage.setItem('preventNextReload', 'true');

            // Clear conversation IDs from localStorage and URL
            localStorage.removeItem('conversation_id');
            localStorage.removeItem('currentlyViewingConversation');

            // Update URL to remove conversation_id parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('conversation_id');
            window.history.pushState({}, '', url);

            // Show welcome section
            const welcomeSection = document.querySelector('.welcome-section');
            if (welcomeSection) {
                welcomeSection.style.display = 'flex';
            }

            // Clear chat messages
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }

            // Update active state in conversation list
            document.querySelectorAll('.conversation-item').forEach(el => {
                el.classList.remove('active');
            });

            // Focus on the chat input
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.focus();
            }
        });
    }

    // Handle logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('conversation_id');
            window.location.href = 'login.html';
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });

    // Add touch swipe functionality for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 100; // Minimum distance for swipe

        // Right swipe (open sidebar)
        if (touchEndX - touchStartX > swipeThreshold && touchStartX < 50) {
            sidebar.classList.add('active');
        }

        // Left swipe (close sidebar)
        if (touchStartX - touchEndX > swipeThreshold && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }

    // Check URL for conversation_id parameter
    const checkUrlForConversation = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation_id');

        console.log('Checking URL for conversation ID:', conversationId);

        if (conversationId) {
            // Store conversation ID in localStorage
            localStorage.setItem('conversation_id', conversationId);

            // Load conversation messages
            loadConversationMessages(conversationId);

            // Update active state in sidebar
            document.querySelectorAll('.conversation-item').forEach(el => {
                if (el.dataset.id === String(conversationId)) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        } else {
            // Check if we have a conversation ID in localStorage
            const storedConversationId = localStorage.getItem('conversation_id');
            if (storedConversationId) {
                console.log('Found stored conversation ID:', storedConversationId);

                // Update URL with conversation ID
                const url = new URL(window.location.href);
                url.searchParams.set('conversation_id', storedConversationId);
                window.history.pushState({}, '', url);

                // Load conversation messages
                loadConversationMessages(storedConversationId);

                // Update active state in sidebar
                document.querySelectorAll('.conversation-item').forEach(el => {
                    if (el.dataset.id === String(storedConversationId)) {
                        el.classList.add('active');
                    } else {
                        el.classList.remove('active');
                    }
                });
            } else {
                console.log('No conversation ID found, showing welcome section');
                // Show welcome section
                const welcomeSection = document.querySelector('.welcome-section');
                if (welcomeSection) {
                    welcomeSection.style.display = 'flex';
                }
            }
        }
    };

    // Listen for loadConversation event from ChatInput.js
    window.addEventListener('loadConversation', (event) => {
        const { conversationId } = event.detail;
        if (conversationId) {
            loadConversationMessages(conversationId);
        }
    });

    // Listen for conversationCreated event from ChatInput.js
    window.addEventListener('conversationCreated', (event) => {
        try {
            const { id, title } = event.detail;
            const conversationList = document.getElementById('conversationList');
            if (!conversationList) return;

            // Remove "No conversations yet" message if it exists
            const noConversationsMsg = conversationList.querySelector('.loading-conversations');
            if (noConversationsMsg) {
                conversationList.removeChild(noConversationsMsg);
            }

            // Create new conversation item
            const item = document.createElement('div');
            item.className = 'conversation-item active'; // New conversation is active
            item.dataset.id = id;
            item.innerHTML = `
                <span class="conversation-icon">💬</span>
                <span class="conversation-title">${title}</span>
            `;

            // Add click event to load conversation
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Check if we're already viewing this conversation
                const currentConversationId = localStorage.getItem('currentlyViewingConversation');
                if (currentConversationId === String(id)) {
                    console.log('Already viewing this conversation, no need to reload');
                    return;
                }

                console.log('Switching to conversation:', id);

                // Set flag to prevent unnecessary reloads
                sessionStorage.setItem('preventNextReload', 'true');

                // Update URL with conversation ID
                const url = new URL(window.location.href);
                url.searchParams.set('conversation_id', id);
                window.history.pushState({}, '', url);

                // Store conversation ID in localStorage
                localStorage.setItem('conversation_id', String(id));

                // Update active state
                document.querySelectorAll('.conversation-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');

                // Load conversation messages
                loadConversationMessages(String(id));
            });

            // Set all other conversations as inactive
            document.querySelectorAll('.conversation-item').forEach(el => {
                el.classList.remove('active');
            });

            // Add new conversation at the top of the list
            if (conversationList.firstChild) {
                conversationList.insertBefore(item, conversationList.firstChild);
            } else {
                conversationList.appendChild(item);
            }
        } catch (error) {
            console.error('Error adding new conversation to list:', error);
        }
    });

    // Initialize
    const init = async () => {
        // Get user info
        await getUserInfo();

        // Load conversations
        await loadConversations();

        // Check URL for conversation_id
        checkUrlForConversation();
    };

    // Run initialization
    init();
});
