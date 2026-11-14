import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ROLE } from './hooks'
import './styles.css'
import { applyTheme } from './theme'

document.documentElement.dataset['role'] = ROLE
applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
