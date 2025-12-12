import React, { useEffect, useState } from 'react'
import { MessageCircle, Clock, RefreshCw, Send, Headphones } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import apiService from '../../services/api.service'
import ChatWindow from '../../features/chat/components/ChatWindow'
import GlassCard from '../../components/common/GlassCard'
import PageSkeleton from '../../components/common/PageSkeleton'

export default function UserConversations() {
  const [conversation, setConversation] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadConversation = async () => {
    try {
      const res = await apiService.get('/chat/my')
      if (res.success) setConversation(res.data.conversation)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadConversation().finally(() => setLoading(false))
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    await loadConversation()
    setRefreshing(false)
  }

  const resume = async () => {
    if (!conversation) {
      await loadConversation()
    }
    setOpen(true)
  }

  if (loading) {
    return <PageSkeleton mode="dashboard" />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Conversations</h1>
          <p className="text-gray-600 dark:text-gray-400">Get help from our support team</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={resume}
            className="bg-gradient-to-r from-blue-500 to-orange-600 hover:from-blue-600 hover:to-orange-700 shadow-lg shadow-blue-500/30 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {conversation ? 'Open Chat' : 'Start Chat'}
          </Button>
        </div>
      </div>

      {/* Hero Card */}
      <GlassCard>
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Need Help?</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl">
                Our support team is here to assist you. Start a conversation and get quick answers to your questions about using Espot Browser.
              </p>
            </div>
            <Button
              size="lg"
              onClick={resume}
              className="bg-gradient-to-r from-blue-500 to-orange-600 hover:from-blue-600 hover:to-orange-700 shadow-lg gap-2"
            >
              <Send className="w-5 h-5" />
              {conversation ? 'Resume Conversation' : 'Start Conversation'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Conversation Card */}
      {conversation ? (
        <GlassCard hover>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Support Conversation</h3>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600">
                      <div className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse"></div>
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Created {new Date(conversation.created_at).toLocaleDateString()}
                    </div>
                    <span>•</span>
                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      ID: {conversation.id?.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={resume}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Open Chat
              </Button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversations Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Start a new conversation with our support team to get help with any questions you have.
            </p>
            <Button
              onClick={resume}
              className="bg-gradient-to-r from-blue-500 to-orange-600 hover:from-blue-600 hover:to-orange-700 shadow-lg gap-2"
            >
              <Send className="w-4 h-4" />
              Start Your First Conversation
            </Button>
          </div>
        </GlassCard>
      )}

      <ChatWindow open={open} onClose={() => setOpen(false)} conversationId={conversation?.id || null} />
    </div>
  )
}
