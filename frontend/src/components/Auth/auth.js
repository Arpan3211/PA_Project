document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000/api/v1';
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // If on login or register page, redirect to chat
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname.includes('register.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // If not logged in and not on login or register page, redirect to login
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html')) {
            window.location.href = 'login.html';
        }
    }
    
    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('loginError');
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            // Clear previous error
            errorElement.textContent = '';
            
            // Add loading state
            submitButton.classList.add('btn-loading');
            submitButton.disabled = true;
            
            try {
                // Create form data for OAuth2 compatibility
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);
                
                const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                
                // Store token in localStorage
                localStorage.setItem('token', response.data.access_token);
                
                // Redirect to chat page
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Login error:', error);
                errorElement.textContent = error.response?.data?.detail || 'Login failed. Please try again.';
                
                // Remove loading state
                submitButton.classList.remove('btn-loading');
                submitButton.disabled = false;
            }
        });
    }
    
    // Register form handling
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('registerError');
            const submitButton = registerForm.querySelector('button[type="submit"]');
            
            // Clear previous error
            errorElement.textContent = '';
            
            // Add loading state
            submitButton.classList.add('btn-loading');
            submitButton.disabled = true;
            
            try {
                await axios.post(`${API_BASE_URL}/auth/register`, {
                    username,
                    email,
                    password
                });
                
                // Redirect to login page
                window.location.href = 'login.html?registered=true';
            } catch (error) {
                console.error('Registration error:', error);
                errorElement.textContent = error.response?.data?.detail || 'Registration failed. Please try again.';
                
                // Remove loading state
                submitButton.classList.remove('btn-loading');
                submitButton.disabled = false;
            }
        });
    }
    
    // Check for registration success message
    if (window.location.search.includes('registered=true')) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = 'Registration successful! Please login.';
            loginError.style.color = '#2ecc71';
        }
    }
    
    // Password visibility toggle
    const setupPasswordToggle = () => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            // Wrap input in a div
            const wrapper = document.createElement('div');
            wrapper.className = 'password-toggle';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            // Create toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'password-toggle-btn';
            toggleBtn.innerHTML = '👁️';
            toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
            wrapper.appendChild(toggleBtn);
            
            // Add event listener
            toggleBtn.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleBtn.innerHTML = '🔒';
                } else {
                    input.type = 'password';
                    toggleBtn.innerHTML = '👁️';
                }
                input.focus();
            });
        });
    };
    
    // Setup password toggle
    setupPasswordToggle();
});
