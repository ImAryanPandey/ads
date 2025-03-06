import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --primary-color: #6C5CE7;
    --secondary-color: #A29BFE;
    --background-light: linear-gradient(135deg, #F0F0FF 0%, #FFFFFF 100%);
    --background-dark: #1E1E1E; /* Soft dark gray */
    --container-light: #FFFFFF;
    --container-dark: #2C2C2C; /* Slightly lighter for contrast */
    --text-light: #333333;
    --text-dark: #E0E0E0;
    --input-text-light: #333333;
    --input-text-dark: #E0E0E0;
    --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    --spacing-unit: 8px;
  }

  body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    background: var(--background-light);
    color: var(--text-light);
    transition: background 0.3s ease, color 0.3s ease;
  }

  .dark-mode {
    background: var(--background-dark);
    color: var(--text-dark);
  }

  .dark-mode .MuiPaper-root, .dark-mode .container {
    background: var(--container-dark);
  }

  input, textarea {
    color: var(--input-text-light);
  }

  .dark-mode input, .dark-mode textarea {
    color: var(--input-text-dark);
  }

  ::placeholder {
    color: var(--text-light);
    opacity: 0.7;
  }

  .dark-mode ::placeholder {
    color: var(--text-dark);
    opacity: 0.7;
  }

  a {
    color: var(--secondary-color);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  a:hover {
    color: var(--primary-color);
    text-decoration: underline;
  }

  button {
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  button:hover {
    transform: scale(1.05);
  }
`;

export default GlobalStyles;