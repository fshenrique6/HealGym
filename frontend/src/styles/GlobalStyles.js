import { createGlobalStyle } from 'styled-components';
import '@fontsource/marcellus';
import '@fontsource/cinzel/600.css';

export const GlobalStyles = createGlobalStyle`
  :root {
    --secondary: #2d2d2d;
    --accent: #C6A964;
    --accent-light: #D4B87B;
    --background: #0A0A0A;
    --text: #FFFFFF;
    --text-secondary: #E0E0E0;
    --gradient-start: #000000;
    --gradient-mid: #0A0A0A;
    --gradient-end: #1A1A1A;
    --card-bg: rgba(255, 255, 255, 0.03);
    --white: #FFFFFF;
    --gold-gradient: linear-gradient(45deg, #C6A964 0%, #E2C385 50%, #C6A964 100%);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    overflow-x: hidden;
    margin: 0;
    padding: 0;
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Marcellus', serif;
    background-color: var(--background);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.8;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) var(--secondary);
  }

  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: var(--secondary);
    border-radius: 10px;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.5);
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
    border-radius: 10px;
    border: 2px solid var(--secondary);
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%);
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
  }

  ::-webkit-scrollbar-thumb:active {
    background: var(--accent);
  }

  ::-webkit-scrollbar-corner {
    background: var(--secondary);
  }

  .custom-scroll {
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) transparent;
  }

  .custom-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scroll::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 8px;
  }

  .custom-scroll::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 8px;
    border: none;
    box-shadow: 0 0 10px rgba(198, 169, 100, 0.3);
  }

  .custom-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--accent-light);
    box-shadow: 0 0 15px rgba(198, 169, 100, 0.5);
  }

  h1, h2 {
    font-family: 'Cinzel', serif;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h3, h4, h5, h6 {
    font-family: 'Cormorant', serif;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: 'Italiana', serif;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  p {
    font-family: 'Marcellus', serif;
    line-height: 1.8;
    letter-spacing: 0.3px;
  }
`;
