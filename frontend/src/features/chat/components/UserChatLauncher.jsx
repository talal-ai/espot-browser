import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import ChatWindow from './ChatWindow'
import { chatSocket } from '../services/ChatSocket'

export default function UserChatLauncher() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const openRef = useRef(open)

  // Keep ref in sync with state (avoids stale closure in socket callbacks)
  useEffect(() => {
    openRef.current = open
  }, [open])

  // Reset unread count immediately when opening chat
  const handleOpen = () => {
    setOpen(true)
    setUnreadCount(0) // Clear badge immediately
  }

  // Called when messages are marked as read inside ChatWindow
  const handleMessagesRead = useCallback(() => {
    setUnreadCount(0) // Clear badge immediately when messages are seen
  }, [])

  // Listen for new messages even when chat is closed
  useEffect(() => {
    chatSocket.connect()
    
    const onNewMessage = (payload) => {
      // Only count if chat is closed and message is from admin (not user)
      if (!openRef.current && payload?.sender?.role !== 'user') {
        setUnreadCount(prev => prev + 1)
      }
    }
    
    chatSocket.on('new_message', onNewMessage)
    return () => {
      chatSocket.off('new_message', onNewMessage)
    }
  }, []) // Empty deps - uses ref for open state

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleOpen}
        className="relative gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Support
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      <ChatWindow 
        open={open} 
        onClose={() => setOpen(false)} 
        onMessagesRead={handleMessagesRead}
        onNewMessage={(payload) => {
          // Only count if chat is closed (shouldn't happen but just in case)
          if (!openRef.current) {
            setUnreadCount(prev => prev + 1)
          }
        }}
      />
    </>
  )
}