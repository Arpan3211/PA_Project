// This script helps track page reloads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded at:', new Date().toISOString());
    
    // Track if this is a fresh page load or a reload
    const pageLoadCount = parseInt(sessionStorage.getItem('pageLoadCount') || '0');
    sessionStorage.setItem('pageLoadCount', (pageLoadCount + 1).toString());
    
    console.log(`This is page load #${pageLoadCount + 1} in this session`);
    
    // Add event listener for beforeunload to track when the page is about to reload
    window.addEventListener('beforeunload', () => {
        console.log('Page is about to unload at:', new Date().toISOString());
    });
});
