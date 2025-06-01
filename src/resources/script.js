async function SubmitForm(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/public';
    } else {
      const error = await response.json();
      document.getElementById('error').textContent = error.message;
    }
  } catch (err) {
    document.getElementById('error').textContent = 'Login failed. Please try again.';
  }
}

document.getElementById('loginForm').addEventListener('submit', SubmitForm);
