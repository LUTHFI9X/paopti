import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { AppearanceProvider } from './context/AppearanceContext'
import { ChatProvider } from './context/ChatContext'
import { ToastProvider } from './context/ToastContext'
import AppRouter from './app/routes/AppRouter'

function App() {
  return (
    <BrowserRouter>
      <AppearanceProvider>
        <ToastProvider>
          <UserProvider>
            <ChatProvider>
              <AppRouter />
            </ChatProvider>
          </UserProvider>
        </ToastProvider>
      </AppearanceProvider>
    </BrowserRouter>
  )
}

export default App
