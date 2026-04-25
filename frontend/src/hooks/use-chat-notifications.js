import { useState, useEffect, useCallback } from 'react'
import { chatSocket } from '../features/chat/services/ChatSocket'
import { useAuth } from '../contexts/AuthContext'

// Simple beep sound using Web Audio API
const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
        // silently ignore
    }
}

// Request notification permission
const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
    }
}

export const useChatNotifications = () => {
    const { user } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)
    const [unreadByConversation, setUnreadByConversation] = useState({}) // Track per conversation

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setUnreadCount(0)
        setUnreadByConversation({})
    }, [])

    // Clear notifications for a specific conversation
    const clearConversationNotifications = useCallback((conversationId) => {
        setUnreadByConversation(prev => {
            const next = { ...prev }
            const count = next[conversationId] || 0
            delete next[conversationId]
            setUnreadCount(curr => Math.max(0, curr - count))
            return next
        })
    }, [])

    // Check if a conversation has unread messages
    const hasUnread = useCallback((conversationId) => {
        return (unreadByConversation[conversationId] || 0) > 0
    }, [unreadByConversation])

    // Get unread count for a specific conversation
    const getUnreadCount = useCallback((conversationId) => {
        return unreadByConversation[conversationId] || 0
    }, [unreadByConversation])

    useEffect(() => {
        // Request permission on mount
        requestNotificationPermission()

        // Connect to socket
        chatSocket.connect()

        const handleNewMessage = (payload) => {
            const message = payload?.message
            const senderId = message?.sender_id
            const conversationId = payload?.conversationId

            // Only notify if message is from someone else
            if (senderId && user?.id && senderId !== user.id && conversationId) {
                // Increment total count
                setUnreadCount(prev => prev + 1)

                // Increment conversation-specific count
                setUnreadByConversation(prev => ({
                    ...prev,
                    [conversationId]: (prev[conversationId] || 0) + 1
                }))

                // Play sound
                playNotificationSound()

                // Show browser notification if permission granted
                if ('Notification' in window && Notification.permission === 'granted') {
                    const senderName = payload?.sender?.username || payload?.sender?.email || 'User'
                    new Notification('New Message from Support', {
                        body: `${senderName} sent you a message`,
                        icon: '/logo.png',
                        tag: 'chat-notification',
                        requireInteraction: false
                    })
                }
            }
        }

        chatSocket.on('new_message', handleNewMessage)

        return () => {
            chatSocket.off('new_message', handleNewMessage)
        }
    }, [user?.id])

    return {
        unreadCount,
        unreadByConversation,
        clearNotifications,
        clearConversationNotifications,
        hasUnread,
        getUnreadCount
    }
}
