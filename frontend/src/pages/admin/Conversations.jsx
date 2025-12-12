import React, { useEffect, useState } from 'react'
import { MessageCircle, Clock, RefreshCw, Users, User, Search, Filter } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import apiService from '../../services/api.service'
import { usersService } from '../../services/users.service'
import ChatWindow from '../../features/chat/components/ChatWindow'
import { chatSocket } from '../../features/chat/services/ChatSocket'
import PageSkeleton from '../../components/common/PageSkeleton'
import GlassCard from '../../components/common/GlassCard'
import StatCard from '../../components/common/StatCard'
import { useChatNotifications } from '../../hooks/use-chat-notifications'

export default function AdminConversations() {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { hasUnread, getUnreadCount, clearConversationNotifications } = useChatNotifications()

  const loadConversations = async () => {
    const res = await apiService.get('/chat/conversations')
    if (res.success) {
      const list = (res.data.items || [])
      const map = new Map()
      for (const c of list) {
        if (!map.has(c.created_by)) map.set(c.created_by, c)
      }
      const unique = Array.from(map.values())
      const enriched = []
      for (const c of unique) {
        let e = { ...c }
        try {
          const u = await usersService.getUser(c.created_by)
          if (u.success && u.data) e.creator = u.data
        } catch { }
        enriched.push(e)
      }
      setItems(enriched)
    }
  }

  useEffect(() => {
    chatSocket.connect()
    const onOpened = async (payload) => {
      const c = payload?.conversation
      if (!c) return
      let enriched = { ...c }
      try {
        const u = await usersService.getUser(c.created_by)
        if (u.success && u.data) enriched.creator = u.data
      } catch { }
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.created_by === enriched.created_by)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = enriched
          return next
        }
        return [enriched, ...prev]
      })
    }
    chatSocket.on('conversation_opened', onOpened)

    setLoading(true)
    loadConversations().finally(() => setLoading(false))

    return () => {
      chatSocket.off('conversation_opened', onOpened)
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    await loadConversations()
    setRefreshing(false)
  }

  // Filter conversations based on search
  const filteredItems = items.filter(c => {
    const query = searchQuery.toLowerCase()
    const name = c.creator?.name?.toLowerCase() || ''
    const username = c.creator?.username?.toLowerCase() || ''
    const email = c.creator?.email?.toLowerCase() || ''
    const id = c.id?.toLowerCase() || ''
    return name.includes(query) || username.includes(query) || email.includes(query) || id.includes(query)
  })

  if (loading) {
    return <PageSkeleton mode="dashboard" />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Conversations</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and respond to user support chats</p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Conversations"
          value={items.length}
          change="Active support threads"
          changeType="neutral"
          icon={MessageCircle}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Unique Users"
          value={items.length}
          change="With active chats"
          changeType="positive"
          icon={Users}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Today's Chats"
          value={items.filter(c => {
            const today = new Date().toDateString()
            return new Date(c.created_at).toDateString() === today
          }).length}
          change="Started today"
          changeType="neutral"
          icon={Clock}
          gradient="bg-gradient-to-br from-blue-500 to-orange-500"
        />
      </div>

      {/* Search Bar */}
      <GlassCard>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, username, email, or conversation ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 dark:bg-gray-800/50"
              />
            </div>
            <Badge variant="outline" className="px-3 py-1.5">
              {filteredItems.length} {filteredItems.length === 1 ? 'conversation' : 'conversations'}
            </Badge>
          </div>
        </div>
      </GlassCard>

      {/* Conversations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((c) => (
          <GlassCard key={c.id} hover>
            <div className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {c.creator?.name || c.creator?.username || c.creator?.email || 'Unknown User'}
                    </h3>
                    {hasUnread(c.id) ? (
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse"></div>
                        {getUnreadCount(c.id)} New
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse"></div>
                        Active
                      </Badge>
                    )}
                  </div>
                  {/* Show username and email as secondary info */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {c.creator?.name 
                      ? `@${c.creator?.username || '—'} • ${c.creator?.email || '—'}`
                      : c.creator?.email || '—'
                    }
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <span className="font-mono text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {c.id?.substring(0, 8)}...
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setActiveId(c.id)
                  clearConversationNotifications(c.id)
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md gap-2 relative"
              >
                <MessageCircle className="w-4 h-4" />
                Open Conversation
                {hasUnread(c.id) && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse">
                    {getUnreadCount(c.id) > 9 ? '9+' : getUnreadCount(c.id)}
                  </span>
                )}
              </Button>
            </div>
          </GlassCard>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full">
            <GlassCard>
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No Matching Conversations' : 'No Active Conversations'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  {searchQuery
                    ? 'Try adjusting your search query to find conversations.'
                    : 'When users start support chats, they will appear here for you to respond to.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <ChatWindow 
        open={!!activeId} 
        onClose={() => setActiveId(null)} 
        conversationId={activeId || null}
        onMessagesRead={() => {
          // Clear badge for this conversation immediately when messages are read
          if (activeId) {
            clearConversationNotifications(activeId)
          }
        }}
      />
    </div>
  )
}
