document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  // Toggle sidebar, icon animation, and overlay
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menuToggle.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  // Close sidebar when overlay is clicked
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    menuToggle.classList.remove('open');
    overlay.classList.remove('active');
  });
  // Dark Mode Toggle
  const darkModeToggle = document.getElementById('darkModeToggle');

  darkModeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('darkMode', 'enabled');
    } else {
      localStorage.setItem('darkMode', 'disabled');
    }
  });

  // Check saved preference on page load
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
  }

  // Initialize countdowns
  initializeCountdowns();

  // Form Submission
  const form = document.getElementById('regForm');
  const confirmationMessage = document.getElementById('confirmationMessage');
  const googleFormLink = document.getElementById('googleFormLink');
  const badge = document.getElementById('badge');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const eventName = document.getElementById('event').value;

    // Validate form
    if (!name || !email || !eventName) {
      showMessage('❌ Please fill all the fields.', 'red');
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      showMessage('❌ Please enter a valid email address.', 'red');
      return;
    }

    try {
      // Send data to backend server
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          email, 
          event: eventName 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle server-side validation errors
        throw new Error(data.error || 'Registration failed');
      }

      // Success case
      showMessage('✅ You have successfully registered for the event!', 'green');
      badge.style.display = 'block';
      googleFormLink.style.display = 'block';
      form.reset();

    } catch (error) {
      console.error('Registration error:', error);
      showMessage(`❌ ${error.message}`, 'red');
      googleFormLink.style.display = 'none'; // Hide Google Form link on error
    }
  });

  function showMessage(text, color) {
    confirmationMessage.textContent = text;
    confirmationMessage.style.color = color;
    confirmationMessage.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
      confirmationMessage.style.display = 'none';
    }, 5000);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function initializeCountdowns() {
    updateCountdown('techCountdown', 'May 23, 2025 09:00:00');
    updateCountdown('culturalFestCountdown', 'May 20, 2025 09:00:00');
  }

  function updateCountdown(elementId, dateString) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const targetDate = new Date(dateString).getTime();
    
    const interval = setInterval(function() {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance < 0) {
        clearInterval(interval);
        element.innerHTML = "EVENT IN PROGRESS!";
        element.style.color = "#ff007f";
        element.style.fontWeight = "bold";
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      element.innerHTML = `<strong>Countdown:</strong> ${days}d ${hours}h ${minutes}m ${seconds}s`;
      
      if (days < 3) {
        element.style.color = "#ff007f";
      }
    }, 1000);
  }
});