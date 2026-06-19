const piroTechKnowledgeBase = {
    "who are you": "I am the PeroTech AI assistant. I'm here to help you learn more about our innovative AI solutions and business services.",
    "what is pirotech": "PeroTech is a leading provider of innovative AI solutions and business services, dedicated to helping businesses leverage the power of artificial intelligence.",
    "services": "We offer a range of services including AI consultation, custom AI model development, business process automation, and strategic tech implementation.",
    "products": "Our portfolio includes several bootstrapped SaaS products like FeedHive (Social Media Management), Aidbase (AI Support), LinkDrip (Link Engagement), and TinyKiwi (Image Editing).",
    "feedhive": "FeedHive is one of our flagship products, a powerful AI-driven social media management tool that helps you recycle content and maximize engagement.",
    "aidbase": "Aidbase is an AI-powered support tool designed to streamline customer service and provide instant, accurate responses to user queries.",
    "contact": "You can reach out to us via the contact form on our newsletter page or connect with us on social media channels listed on our home page.",
    "default": "I'm not sure I understand. Could you ask about our services, products, or what PeroTech does?"
};

function getBotResponse(input) {
    input = input.toLowerCase();
    for (const key in piroTechKnowledgeBase) {
        if (input.includes(key)) {
            return piroTechKnowledgeBase[key];
        }
    }
    return piroTechKnowledgeBase["default"];
}

document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.querySelector('.chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');

    function addMessage(message, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';

            // Simulate typing delay
            setTimeout(() => {
                const response = getBotResponse(message);
                addMessage(response, false);
            }, 500);
        }
    }

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    // Initial greeting
    setTimeout(() => {
        addMessage("Hello! I'm the PeroTech AI assistant. How can I help you today?", false);
    }, 500);
});
