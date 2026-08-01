/**
 * Luxius Core Application
 * Handles UI interactions and simulated data synchronization.
 */

class LuxiusApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("Luxius Initialized ✦");
        this.setupNavigation();
        this.startSimulatedStats();
    }

    /**
     * Handle Sidebar Navigation
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.textContent === 'Salir') return;
                
                e.preventDefault();
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Track navigation for future React state migration
                console.log(`Navigating to: ${item.textContent}`);
            });
        });
    }

    /**
     * Simulate the 5-second polling from IMPGESV2
     * but with subtle UI updates.
     */
    startSimulatedStats() {
        setInterval(() => {
            const completedCard = document.querySelector('.stat-card:nth-child(3) .stat-value');
            if (completedCard) {
                let currentVal = parseInt(completedCard.textContent.replace(',', ''));
                if (Math.random() > 0.7) {
                    currentVal++;
                    completedCard.textContent = currentVal.toLocaleString();
                    this.showPulse(completedCard);
                }
            }
        }, 5000);
    }

    showPulse(element) {
        element.style.color = '#ff6b00';
        element.style.transition = 'color 0.3s ease';
        setTimeout(() => {
            element.style.color = '';
        }, 1000);
    }
}

// Initialize the App
document.addEventListener('DOMContentLoaded', () => {
    window.luxius = new LuxiusApp();
});
