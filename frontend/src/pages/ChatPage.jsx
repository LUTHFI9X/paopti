import { useState, useEffect, useRef, useMemo } from 'react'
import { useUser, ROLES } from '../context/UserContext'
import { useChat } from '../context/ChatContext'

function ChatPage() {
  const { user, users } = useUser()
  const {
    // eslint-disable-next-line no-unused-vars
    chats,
    sendMessage,
    markAsRead,
    getChat,
    createPrivateChat,
    createGroupChat,
    getUnreadCount,
    getTotalUnread,
    getChatList,
  } = useChat()

  const [activeChatId, setActiveChatId] = useState(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Get all other users for private chat
  const availableUsers = useMemo(() => {
    if (!user) return []
    return users.filter(u => u.id !== user.id)
  }, [users, user])

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return availableUsers
    const query = searchQuery.toLowerCase()
    return availableUsers.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      (u.department && u.department.toLowerCase().includes(query))
    )
  }, [availableUsers, searchQuery])

  // Get chat list for current user
  const chatList = useMemo(() => {
    if (!user) return []
    return getChatList(user.id)
  }, [getChatList, user])

  // Build conversations list
  const conversations = useMemo(() => {
    return chatList.map(chat => ({
      id: chat.id,
      name: chat.type === 'private'
        ? (chat.participantNames?.[chat.participants.find(p => p !== user?.id)] ||
           availableUsers.find(u => u.id === chat.participants.find(p => p !== user?.id))?.name ||
           'Unknown')
        : chat.name,
      type: chat.type,
      isGroup: chat.type === 'group',
      lastMessage: chat.lastMessage || (chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content : ''),
      unread: getUnreadCount(chat.id, user?.id || ''),
      timestamp: chat.lastActivity || chat.createdAt,
      participants: chat.participants,
      description: chat.description,
    }))
  }, [chatList, user, availableUsers, getUnreadCount])

  const activeChat = activeChatId ? getChat(activeChatId) : null
  const totalUnread = getTotalUnread(user?.id || '')

  // Add notification helper
  const addNotification = (message) => {
    // eslint-disable-next-line react-hooks/purity
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeChatId, activeChat?.messages?.length])

  // Mark messages as read when opening a chat
  useEffect(() => {
    if (activeChatId && user?.id) {
      markAsRead(activeChatId, user.id)
    }
  }, [activeChatId, user?.id, markAsRead])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [draftMessage])

  const handleSendMessage = () => {
    const text = draftMessage.trim()
    if (!text || !user?.id || !user?.name || !activeChatId) return
    sendMessage(activeChatId, user.id, user.name, text)
    setDraftMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleStartPrivateChat = (otherUser) => {
    const chatId = [user.id, otherUser.id].sort().join('-')
    let chat = getChat(chatId)

    if (!chat) {
      createPrivateChat(user.id, otherUser.id, user.name, otherUser.name)
      chat = getChat(chatId)
    }

    setActiveChatId(chatId)
    setShowNewChat(false)
    setSearchQuery('')
    addNotification(`Memulai chat dengan ${otherUser.name}`)
  }

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedParticipants.length < 2) return

    const groupId = createGroupChat(
      newGroupName.trim(),
      newGroupDesc.trim(),
      user.id,
      user.name,
      selectedParticipants.map(p => p.id)
    )

    setActiveChatId(groupId)
    setShowNewGroup(false)
    setNewGroupName('')
    setNewGroupDesc('')
    setSelectedParticipants([])
    addNotification(`Grup "${newGroupName.trim()}" berhasil dibuat`)
  }

  const toggleParticipant = (u) => {
    setSelectedParticipants(prev => {
      if (prev.find(p => p.id === u.id)) {
        return prev.filter(p => p.id !== u.id)
      }
      return [...prev, u]
    })
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin'
    } else {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }
  }

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const date = new Date(timestamp)
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Baru'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}j`
    if (days < 7) return `${days}h`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (id) => {
    const colors = ['#1f4f96', '#27ae60', '#e74c3c', '#9b59b6', '#f39c12', '#3498db', '#2ecc71', '#e91e63', '#00bcd4', '#8bc34a']
    const index = id ? id.charCodeAt(0) % colors.length : 0
    return colors[index]
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case ROLES.AUDITOR: return 'Auditor'
      case ROLES.KSPI: return 'KSPI'
      case ROLES.ADMIN: return 'Admin'
      default: return role
    }
  }

  // Get users not yet in the group (for invite)
  const usersNotInGroup = useMemo(() => {
    if (!activeChat || activeChat.type !== 'group') return []
    return availableUsers.filter(u => !activeChat.participants.includes(u.id))
  }, [activeChat, availableUsers])

  return (
    <section className="team-chat-page">
      <div className="team-chat-header">
        <div className="team-chat-title-block">
          <h2>Team Chat</h2>
        </div>
        <div className="team-chat-toolbar">
          <div className="team-chat-metric">
            <span>{conversations.length}</span>
            <small>Percakapan</small>
          </div>
          <div className="team-chat-metric unread">
            <span>{totalUnread}</span>
            <small>Belum Dibaca</small>
          </div>
          <button className="team-chat-new-btn" onClick={() => { setShowNewChat(true); setShowNewGroup(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Chat Baru
          </button>
        </div>
      </div>

      <div className="chatapp">
      {/* Notifications */}
      <div className="chat-notifications">
        {notifications.map(n => (
          <div key={n.id} className="chat-toast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {n.message}
          </div>
        ))}
      </div>

      {/* Chat List Panel */}
      <div className={`chatlist-panel ${showNewChat || showNewGroup ? 'collapsed' : ''}`}>
        <div className="chatlist-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Pesan
          </h2>
          <div className="chatlist-actions">
            <button className="action-btn" onClick={() => { setShowNewChat(true); setShowNewGroup(false); }} title="Chat Baru">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chatlist-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Cari pesan atau grup..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {totalUnread > 0 && (
          <div className="chatlist-unread">
            <span>{totalUnread} pesan belum terbaca</span>
          </div>
        )}

        <div className="chatlist-conversations">
          {conversations.length > 0 ? (
            <div className="chatlist-all">
              <div className="chatlist-section-label">Percakapan</div>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`chatlist-item ${activeChatId === conv.id ? 'active' : ''}`}
                  onClick={() => setActiveChatId(conv.id)}
                >
                  <div className="chatlist-avatar" style={{ background: conv.isGroup ? 'linear-gradient(135deg, #1f4f96, #3498db)' : getAvatarColor(conv.participants?.find(p => p !== user?.id)) }}>
                  {conv.isGroup ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ) : (
                    getInitials(conv.name)
                  )}
                </div>
                <div className="chatlist-info">
                  <div className="chatlist-itemname">
                    <span>{conv.name}</span>
                    <small>{formatRelativeTime(conv.timestamp)}</small>
                  </div>
                  <div className="chatlist-lastmsg">
                    <p>{conv.lastMessage || 'Mulai percakapan...'}</p>
                    {conv.unread > 0 && <span className="unread-dot">{conv.unread}</span>}
                  </div>
                </div>
                <div className={`chatlist-type ${conv.isGroup ? 'group' : 'private'}`}>
                  {conv.isGroup ? 'Grup' : 'Pribadi'}
                </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="chatlist-empty">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Belum ada percakapan</p>
              <button className="start-chat-btn" onClick={() => setShowNewChat(true)}>Mulai Chat</button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Panel */}
      <div className={`newchat-panel ${showNewChat ? 'slide-in' : ''}`}>
        <div className="newchat-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat Baru
          </h3>
          <button className="close-btn" onClick={() => setShowNewChat(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="newchat-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Cari nama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="newchat-list">
          <div className="newchat-section-label">Pilih untuk memulai chat</div>
          {filteredUsers.map((u) => (
            <button key={u.id} className="newchat-user" onClick={() => handleStartPrivateChat(u)}>
              <div className="user-avatar" style={{ background: getAvatarColor(u.id) }}>{getInitials(u.name)}</div>
              <div className="user-info">
                <span className="user-name">{u.name}</span>
                <span className="user-meta">{getRoleLabel(u.role)} • {u.department || '-'}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* New Group Panel */}
      <div className={`newgroup-panel ${showNewGroup ? 'slide-in' : ''}`}>
        <div className="newgroup-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Grup Baru
          </h3>
          <button className="close-btn" onClick={() => setShowNewGroup(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="newgroup-form">
          <div className="form-field">
            <label>Nama Grup</label>
            <input type="text" placeholder="Contoh: Tim Audit Q3 2024" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Deskripsi (opsional)</label>
            <input type="text" placeholder="Topik atau deskripsi grup..." value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Anggota ({selectedParticipants.length} dipilih)</label>
          </div>
        </div>
        <div className="newgroup-list">
          {availableUsers.map((u) => (
            <button key={u.id} className={`newgroup-user ${selectedParticipants.find(p => p.id === u.id) ? 'selected' : ''}`} onClick={() => toggleParticipant(u)}>
              <div className={`user-avatar ${selectedParticipants.find(p => p.id === u.id) ? 'selected' : ''}`} style={{ background: getAvatarColor(u.id) }}>{getInitials(u.name)}</div>
              <div className="user-info">
                <span className="user-name">{u.name}</span>
                <span className="user-meta">{getRoleLabel(u.role)}</span>
              </div>
              <div className="user-check">
                {selectedParticipants.find(p => p.id === u.id) && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="newgroup-footer">
          <button className="cancel-btn" onClick={() => setShowNewGroup(false)}>Batal</button>
          <button className="create-btn" onClick={handleCreateGroup} disabled={!newGroupName.trim() || selectedParticipants.length < 2}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Buat Grup
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chatarea-panel">
        {activeChat ? (
          <>
            <div className="chatarea-header">
              <div className="header-back" onClick={() => setActiveChatId(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </div>
              <div className="header-avatar" style={{ background: activeChat.type === 'group' ? 'linear-gradient(135deg, #1f4f96, #3498db)' : getAvatarColor(activeChat.participants?.find(p => p !== user?.id)) }}>
                {activeChat.type === 'group' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ) : (
                  getInitials(activeChat.name || 'U')
                )}
              </div>
              <div className="header-info">
                <h3>{activeChat.name || 'Unknown'}</h3>
                <p>{activeChat.type === 'group' ? `${activeChat.participants?.length || 0} anggota` : 'Online'}</p>
              </div>
              <div className="header-actions">
                {activeChat.type === 'group' && !activeChat.isDefault && (
                  <button className="action-btn" onClick={() => setShowInvite(!showInvite)} title="Undang Anggota">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </button>
                )}
                <button className="action-btn" onClick={() => setShowGroupInfo(!showGroupInfo)} title="Info">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Invite Panel */}
            {showInvite && activeChat.type === 'group' && !activeChat.isDefault && (
              <div className="invite-panel">
                <div className="invite-header">
                  <h4>Undang Anggota</h4>
                  <button className="close-btn small" onClick={() => setShowInvite(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="invite-list">
                  {usersNotInGroup.length > 0 ? (
                    usersNotInGroup.map((u) => (
                      <button key={u.id} className="invite-user" onClick={() => handleStartPrivateChat(u)}>
                        <div className="user-avatar" style={{ background: getAvatarColor(u.id) }}>{getInitials(u.name)}</div>
                        <div className="user-info">
                          <span className="user-name">{u.name}</span>
                          <span className="user-meta">{getRoleLabel(u.role)}</span>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    ))
                  ) : (
                    <div className="invite-empty">
                      <p>Semua anggota sudah ada di grup</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="chatarea-messages">
              {activeChat.messages && activeChat.messages.length > 0 ? (
                <>
                  {activeChat.messages.map((message, index) => {
                    const prevMessage = activeChat.messages[index - 1]
                    const showDateSeparator = !prevMessage || formatDate(message.timestamp) !== formatDate(prevMessage.timestamp)
                    const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId

                    return (
                      <div key={message.id}>
                        {showDateSeparator && (
                          <div className="date-divider">
                            <span>{formatDate(message.timestamp)}</span>
                          </div>
                        )}
                        <div className={`message-row ${message.senderId === user?.id ? 'outgoing' : 'incoming'}`}>
                          {message.senderId !== user?.id && (
                            <div className="msg-avatar" style={{ background: getAvatarColor(message.senderId), opacity: showAvatar ? 1 : 0.3 }}>
                              {getInitials(message.senderName)}
                            </div>
                          )}
                          <div className="msg-bubble-wrap">
                            {showAvatar && message.senderId !== user?.id && (
                              <span className="msg-sender">{message.senderName}</span>
                            )}
                            <div className="msg-bubble">
                              <p>{message.content}</p>
                            </div>
                            <span className="msg-time">{formatTime(message.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="chatarea-empty">
                  <div className="empty-illustration">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p>Belum ada pesan</p>
                  <span>Kirim pesan pertama untuk memulai</span>
                </div>
              )}
            </div>

            <div className="chatarea-input">
              <textarea
                ref={textareaRef}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                rows="1"
              />
              <button className="send-btn" onClick={handleSendMessage} disabled={!draftMessage.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="chatarea-placeholder">
            <div className="placeholder-content">
              <div className="placeholder-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Portal AOPTI Chat</h3>
              <p>Pilih percakapan atau mulai chat baru dengan rekan tim audit</p>
              <div className="placeholder-actions">
                <button className="action-btn" onClick={() => setShowNewGroup(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  Grup Baru
                </button>
                <button className="action-btn primary" onClick={() => setShowNewChat(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Chat Pribadi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group Info Panel */}
      {showGroupInfo && activeChat && (
        <div className="groupinfo-panel">
          <div className="groupinfo-header">
            <h3>Info Grup</h3>
            <button className="close-btn" onClick={() => setShowGroupInfo(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="groupinfo-content">
            <div className="groupinfo-avatar">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h4>{activeChat.name}</h4>
            {activeChat.description && <p className="group-desc">{activeChat.description}</p>}

            <div className="groupinfo-members">
              <h5>Anggota ({activeChat.participants?.length || 0})</h5>
              <div className="members-list">
                {activeChat.participants?.map((pid) => {
                  const member = users.find(u => u.id === pid)
                  return (
                    <div key={pid} className="member-item">
                      <div className="member-avatar" style={{ background: getAvatarColor(pid) }}>
                        {getInitials(member?.name || 'U')}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{member?.name || 'Unknown'}</span>
                        <span className="member-role">{getRoleLabel(member?.role)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  )
}

export default ChatPage
