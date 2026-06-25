import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource/mulish/400.css'
import '@fontsource/mulish/500.css'
import '@fontsource/mulish/600.css'
import '@fontsource/mulish/700.css'
import '@fontsource/mulish/800.css'
import App from './App.tsx'
import './index.css'

// Apply the saved theme before first paint (default is light, the visa-drill look).
try {
  if (localStorage.getItem("visadrill.theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch {
  /* localStorage unavailable - stay on the default light theme */
}

createRoot(document.getElementById("root")!).render(<App />);
