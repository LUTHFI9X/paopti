import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { AppearanceProvider } from './context/AppearanceContext'
import { ChatProvider } from './context/ChatContext'
import AppRouter from './app/routes/AppRouter'

function App() {
  return (
    <BrowserRouter>
      <AppearanceProvider>
        <UserProvider>
          <ChatProvider>
            <AppRouter />
          </ChatProvider>
        </UserProvider>
      </AppearanceProvider>
    </BrowserRouter>
  )
}

export default App
