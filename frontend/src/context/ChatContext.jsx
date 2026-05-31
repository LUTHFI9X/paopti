import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from './UserContext'
import { getChatMessages, sendChatMessage } from '../services/spiHubApi'

const ChatContext = createContext(null)

function buildPrivateChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('-')
}

function mapMessage(message, currentUserId) {
  return {
    id: `msg-${message.id}`,
    serverId: Number(message.id),
    senderId: message.sender,
    senderName: message.sender_name,
    content: message.message,
    timestamp: message.created_at,
    read: message.sender === currentUserId,
  }
}

function createAutoGroup(users) {
  // Hanya auditor dan KSPI yang masuk grup otomatis (bukan admin)
  const members = users.filter((u) => u.role === 'auditor' || u.role === 'kspi')
  return {
    id: 'team-group',
    name: 'Grup AOPTI',
    type: 'group',
    description: 'Grup otomatis berisi seluruh Auditor AOPTI dan KSPI',
    isDefault: true,
    participants: members.map((u) => u.id),
    participantNames: members.reduce((names, u) => {
      names[u.id] = u.name
      return names
    }, {}),
    messages: [],
    createdAt: new Date().toISOString(),
  }
}

function ChatProvider({ children }) {
  const { user, users } = useUser()
  const [chats, setChats] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const chatsRef = useRef(chats)

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  const getLastServerId = useCallback((messages = []) => {
    if (messages.length === 0) return 0
    const last = messages[messages.length - 1]
    return Number(last?.serverId || 0)
  }, [])

  const appendMessages = useCallback((state, chatId, incoming, currentUserId) => {
    if (!incoming || incoming.length === 0) return state
    const chat = state[chatId]
    if (!chat) return state

    const existingIds = new Set(chat.messages.map((msg) => msg.serverId))
    const mapped = incoming
      .map((message) => mapMessage(message, currentUserId))
      .filter((message) => !existingIds.has(message.serverId))

    if (mapped.length === 0) return state

    const merged = [...chat.messages, ...mapped]
    const lastMessage = merged[merged.length - 1]

    return {
      ...state,
      [chatId]: {
        ...chat,
        messages: merged,
        lastActivity: lastMessage.timestamp,
        lastMessage: lastMessage.content,
      },
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadChats() {
      if (!user?.id || users.length === 0) {
        setChats({})
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      const autoGroup = createAutoGroup(users)
      const privateChats = users
        .filter((candidate) => candidate.id !== user.id)
        .map((candidate) => {
          const chatId = buildPrivateChatId(user.id, candidate.id)
          return {
            id: chatId,
            name: candidate.name,
            type: 'private',
            participants: [user.id, candidate.id],
            participantNames: {
              [user.id]: user.name,
              [candidate.id]: candidate.name,
            },
            messages: [],
            createdAt: new Date().toISOString(),
          }
        })

      const baseChats = {
        [autoGroup.id]: autoGroup,
        ...privateChats.reduce((acc, chat) => {
          acc[chat.id] = chat
          return acc
        }, {}),
      }

      try {
        const groupMessages = await getChatMessages({ type: 'group', last_id: 0, limit: 200 })
        if (cancelled) return

        const privateMessages = await Promise.all(
          users
            .filter((candidate) => candidate.id !== user.id)
            .map(async (candidate) => {
              const chatId = buildPrivateChatId(user.id, candidate.id)
              const messages = await getChatMessages({
                type: 'private',
                user_id: candidate.id,
                current_user_id: user.id,
                last_id: 0,
                limit: 200,
              })
              return [chatId, messages]
            })
        )

        if (cancelled) return

        const nextChats = { ...baseChats }
        nextChats[autoGroup.id] = {
          ...autoGroup,
          messages: groupMessages.map((message) => mapMessage(message, user.id)),
          lastActivity: groupMessages[groupMessages.length - 1]?.created_at || autoGroup.createdAt,
          lastMessage: groupMessages[groupMessages.length - 1]?.message || '',
        }

        privateMessages.forEach(([chatId, messages]) => {
          if (!nextChats[chatId]) return
          nextChats[chatId] = {
            ...nextChats[chatId],
            messages: messages.map((message) => mapMessage(message, user.id)),
            lastActivity: messages[messages.length - 1]?.created_at || nextChats[chatId].createdAt,
            lastMessage: messages[messages.length - 1]?.message || '',
          }
        })

        setChats(nextChats)
      } catch (_error) {
        if (!cancelled) {
          setChats(baseChats)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadChats()

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.name, users])

  useEffect(() => {
    if (!user?.id || users.length === 0) return undefined

    let cancelled = false
    const interval = window.setInterval(async () => {
      if (cancelled) return

      const currentChats = chatsRef.current
      const groupChat = currentChats['team-group']
      const groupLastId = getLastServerId(groupChat?.messages)

      const privateChats = Object.values(currentChats).filter((chat) => chat.type === 'private')

      try {
        const groupPromise = getChatMessages({ type: 'group', last_id: groupLastId, limit: 200 })
        const privatePromises = privateChats.map(async (chat) => {
          const otherId = chat.participants.find((participant) => participant !== user.id)
          const lastId = getLastServerId(chat.messages)
          const messages = await getChatMessages({
            type: 'private',
            user_id: otherId,
            current_user_id: user.id,
            last_id: lastId,
            limit: 200,
          })
          return [chat.id, messages]
        })

        const [groupMessages, privateResults] = await Promise.all([
          groupPromise,
          Promise.all(privatePromises),
        ])

        setChats((prev) => {
          let nextState = prev

          if (groupMessages && groupMessages.length > 0) {
            nextState = appendMessages(nextState, 'team-group', groupMessages, user.id)
          }

          privateResults.forEach(([chatId, messages]) => {
            if (messages && messages.length > 0) {
              nextState = appendMessages(nextState, chatId, messages, user.id)
            }
          })

          return nextState
        })
      } catch (_error) {
        // Ignore polling errors to keep UI responsive
      }
    }, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [user?.id, users, getLastServerId, appendMessages])

  const sendMessage = useCallback(async (chatId, senderId, senderName, content) => {
    if (!content.trim()) return

    const chat = chats[chatId]
    if (!chat) return

    const payload = {
      sender: senderId,
      sender_name: senderName,
      message: content.trim(),
      message_type: chat.type === 'private' ? 'private' : 'group',
      ...(chat.type === 'private' ? { recipient: chat.participants.find((participant) => participant !== senderId) } : {}),
    }

    const response = await sendChatMessage(payload)
    const storedMessage = response?.data || response
    if (!storedMessage) return

    const nextMessage = mapMessage(storedMessage, senderId)

    setChats((prev) => {
      const existingChat = prev[chatId]
      if (!existingChat) return prev

      return {
        ...prev,
        [chatId]: {
          ...existingChat,
          messages: [...existingChat.messages, nextMessage],
          lastActivity: nextMessage.timestamp,
          lastMessage: nextMessage.content,
        },
      }
    })
  }, [chats])

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
    const chatId = buildPrivateChatId(userId1, userId2)

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
          participants: [...new Set([...participants, creatorId])],
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

// eslint-disable-next-line react-refresh/only-export-components
export { ChatProvider, useChat }
export default ChatContext
