import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ChatContext = createContext(null)

const STORAGE_KEY = 'portalAoptiChats'

function ChatProvider({ children }) {
  const [chats, setChats] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // Load chats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setChats(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  // Save chats to localStorage
  useEffect(() => {
    if (!isLoading && Object.keys(chats).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    }
  }, [chats, isLoading])

  // Initialize default team group
  useEffect(() => {
    if (!isLoading && Object.keys(chats).length === 0) {
      setChats({
        'team-group': {
          id: 'team-group',
          name: 'Team Group',
          type: 'group',
          description: 'Grup diskusi Tim Audit AOPTI',
          isDefault: true,
          participants: [],
          messages: [],
          createdAt: new Date().toISOString(),
        },
      })
    }
  }, [isLoading, chats])

  const sendMessage = useCallback((chatId, senderId, senderName, content) => {
    if (!content.trim()) return

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    }

    setChats((prev) => {
      const chat = prev[chatId]
      if (!chat) return prev

      return {
        ...prev,
        [chatId]: {
          ...chat,
          messages: [...chat.messages, message],
          lastActivity: message.timestamp,
          lastMessage: content.trim(),
        },
      }
    })
  }, [])

  const markAsRead = useCallback((chatId, userId) => {
    setChats((prev) => {
      const chat = prev[chatId]
      if (!chat) return prev

      return {
        ...prev,
        [chatId]: {
          ...chat,
          messages: chat.messages.map((msg) =>
            msg.senderId !== userId ? { ...msg, read: true } : msg
          ),
        },
      }
    })
  }, [])

  const getChat = useCallback((chatId) => {
    return chats[chatId] || null
  }, [chats])

  const getPrivateChat = useCallback((userId1, userId2) => {
    const chatId = [userId1, userId2].sort().join('-')
    return chats[chatId] || null
  }, [chats])

  const createPrivateChat = useCallback((userId1, userId2, user1Name, user2Name) => {
    const chatId = [userId1, userId2].sort().join('-')

    setChats((prev) => {
      if (prev[chatId]) return prev

      return {
        ...prev,
        [chatId]: {
          id: chatId,
          name: user2Name,
          type: 'private',
          participants: [userId1, userId2],
          participantNames: { [userId1]: user1Name, [userId2]: user2Name },
          messages: [],
          createdAt: new Date().toISOString(),
        },
      }
    })
  }, [])

  const createGroupChat = useCallback((name, description, creatorId, creatorName, participants) => {
    const groupId = `group-${Date.now()}`

    setChats((prev) => {
      return {
        ...prev,
        [groupId]: {
          id: groupId,
          name,
          type: 'group',
          description: description || '',
          participants: [...participants, creatorId],
          participantNames: {},
          messages: [],
          createdAt: new Date().toISOString(),
          createdBy: creatorId,
          createdByName: creatorName,
        },
      }
    })

    return groupId
  }, [])

  const addParticipantToGroup = useCallback((chatId, userId, userName) => {
    setChats((prev) => {
      const chat = prev[chatId]
      if (!chat || chat.type !== 'group') return prev
      if (chat.participants.includes(userId)) return prev

      return {
        ...prev,
        [chatId]: {
          ...chat,
          participants: [...chat.participants, userId],
          participantNames: {
            ...chat.participantNames,
            [userId]: userName,
          },
        },
      }
    })
  }, [])

  const getUnreadCount = useCallback((chatId, userId) => {
    const chat = chats[chatId]
    if (!chat) return 0
    return chat.messages.filter((msg) => msg.senderId !== userId && !msg.read).length
  }, [chats])

  const getTotalUnread = useCallback((userId) => {
    return Object.values(chats).reduce((total, chat) => {
      if (chat.type === 'group') {
        if (chat.participants.includes(userId)) {
          return total + getUnreadCount(chat.id, userId)
        }
      } else if (chat.type === 'private') {
        if (chat.participants.includes(userId)) {
          return total + getUnreadCount(chat.id, userId)
        }
      }
      return total
    }, 0)
  }, [chats, getUnreadCount])

  const getChatList = useCallback((userId) => {
    return Object.values(chats)
      .filter((chat) => {
        if (chat.type === 'private') {
          return chat.participants.includes(userId)
        }
        return chat.participants.includes(userId)
      })
      .sort((a, b) => {
        const aTime = a.lastActivity || a.createdAt
        const bTime = b.lastActivity || b.createdAt
        return new Date(bTime) - new Date(aTime)
      })
  }, [chats])

  const value = {
    chats,
    isLoading,
    sendMessage,
    markAsRead,
    getChat,
    getPrivateChat,
    createPrivateChat,
    createGroupChat,
    addParticipantToGroup,
    getUnreadCount,
    getTotalUnread,
    getChatList,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}

export { ChatProvider, useChat }
export default ChatContext
