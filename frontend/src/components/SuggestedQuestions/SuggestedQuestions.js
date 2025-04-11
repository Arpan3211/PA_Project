document.addEventListener('DOMContentLoaded', () => {
    const questionCards = document.querySelectorAll('.question-card');

    questionCards.forEach(card => {
        card.addEventListener('click', () => {
            const question = card.textContent;
            document.getElementById('chatInput').value = question;
        });
    });
});