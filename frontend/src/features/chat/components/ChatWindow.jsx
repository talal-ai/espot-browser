import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, X, MessageCircle, HelpCircle, Check, CheckCheck, Image, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import apiService from '../../../services/api.service'
import { chatSocket } from '../services/ChatSocket'
import { generateKey, encrypt, decrypt, toBase64, encryptBinary, decryptBinary, arrayBufferToBase64, fromBase64 } from '../crypto/crypto'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+al4yCc2ZfY26Ck6GorKifkoV3amJibHyCk6Gor6yjlol8bmVjZ3J/jZqnrK2nl4p9cGdmanuHlqGpr6qjl4p8cGhlanuGlaGorqqkmIp9cWlpb3uHlaGnrKmjl4t+c25ucXyHlJ+lqqijl4t+dHFxdH2IlJ6kp6WglYl8dnR0eH+JlJ2jpaSflYl9d3Z3e4CKlJyjpKOfk4h8eHh6fYKLlJuhoqGdkoZ7eXl7f4OMk5qfoaCckYV6enp8gIWNk5men5+aj4N5e3t+goeOk5ebnpyYjIF5fH1/hIiOk5eampqVi398fX6Bg4qQlZeYl5SSiH5+f4GEh4yRlZaWlJCNhX9/gIKFiIyQk5SUko+LhICBgoSGiYyPkZGQjo2Ig4GCg4WGiYuNj4+OjIqGgoKDhIWHiYqMjY2Mi4mFgoKDhIWGiImKi4uKiYiEgoKDhISFhoiJiYmJiIaEgoKDhISFhoaHiIiIh4aEgoKCg4SEhYaGh4eHhoWEgoKCg4OEhYWGhoeHhoWEg4KCg4OEhIWFhoaGhoWEg4KCgoODhISFhYWFhYWEg4KCgoODhISEhYWFhYSEg4KCgoKDg4SEhISEhISEg4KCgoKDg4ODhISEhISDg4KCgoKCg4ODg4SEhISDg4KCgoKCg4ODg4ODg4ODg4KCgoKCgoODg4ODg4ODgoKCgoKCgoKDg4ODg4ODgoKCgoKCgoKDg4ODg4OCgoKCgoKCgoKDg4ODg4OCgoKCgoKCgoKCg4ODg4OCgoKCgoKCgoKCg4ODgoKCgoKCgoKCgoKCg4ODgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoI='

// Play notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND)
    audio.volume = 0.5
    audio.play().catch(() => {}) // Ignore autoplay errors
  } catch (e) {
    // silently ignore
  }
}

export default function ChatWindow({ open, onClose, conversationId: initialConversationId, onNewMessage, onMessagesRead }) {
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState(initialConversationId || null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const keyRef = useRef(null)
  const startedRef = useRef(false)
  const convRef = useRef(null)
  const pendingRef = useRef({})
  const messagesEndRef = useRef(null)
  const isOpenRef = useRef(open)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Track open state for notification logic
  useEffect(() => {
    isOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 50)
    }
  }, [open, messages])

  // Mark messages as read when chat is open
  const markMessagesAsRead = useCallback(() => {
    if (!open || !conversationId || !user?.id) return
    
    // Find unread messages from other users
    const unreadMessages = messages.filter(
      m => m.sender_id !== user.id && m.status !== 'seen'
    )
    
    if (unreadMessages.length > 0) {
      // Send read receipt for each unread message
      unreadMessages.forEach(m => {
        if (m.id && !m.id.startsWith('temp-')) {
          chatSocket.readReceipt(conversationId, m.id)
        }
      })
      
      // Immediately notify parent to clear badge
      if (onMessagesRead) {
        onMessagesRead()
      }
    }
  }, [open, conversationId, messages, user?.id, onMessagesRead])

  // Mark as read immediately when opening chat or receiving new messages
  useEffect(() => {
    if (open && messages.length > 0) {
      // Use shorter delay for snappier UX
      const timer = setTimeout(markMessagesAsRead, 100)
      return () => clearTimeout(timer)
    }
  }, [open, messages, markMessagesAsRead])

  useEffect(() => {
    if (!open) {
      startedRef.current = false
      return
    }
    chatSocket.connect()
      ; (async () => {
        if (initialConversationId) {
          const id = initialConversationId
          setConversationId(id)
          convRef.current = id
          chatSocket.joinConversation(id)
          const stored = localStorage.getItem(`conv:${id}:key`)
          if (stored) keyRef.current = stored
          const hist = await apiService.get(`/chat/conversations/${id}/messages`)
          if (hist.success) setMessages(hist.data.items || [])
        } else if (!startedRef.current) {
          startedRef.current = true
          const storedConv = localStorage.getItem('current_conversation_id')
          if (storedConv) {
            const id = storedConv
            setConversationId(id)
            convRef.current = id
            chatSocket.joinConversation(id)
            const hist = await apiService.get(`/chat/conversations/${id}/messages`)
            if (hist.success) setMessages(hist.data.items || [])
            return
          }
          const res = await apiService.get('/chat/my')
          if (res.success) {
            const id = res.data.conversation.id
            setConversationId(id)
            convRef.current = id
            chatSocket.joinConversation(id)
            localStorage.setItem('current_conversation_id', id)
            // Defer encryption key until handshake is implemented
          }
        }
      })()
    const onNew = (payload) => {
      if (!payload?.conversationId || payload.conversationId !== convRef.current) return
      const tempId = payload.tempId
      const isFromMe = payload.message?.sender_id === user?.id
      
      if (tempId && pendingRef.current[tempId]) {
        setMessages((m) => {
          const i = m.findIndex((x) => x.id === tempId)
          if (i >= 0) {
            const next = [...m]
            next[i] = payload.message
            return next
          }
          return [...m, payload.message]
        })
        delete pendingRef.current[tempId]
        return
      }
      
      setMessages((m) => {
        const exists = m.some((x) => x.id === payload.message.id)
        return exists ? m : [...m, payload.message]
      })
      
      // Play sound and notify for messages from others
      if (!isFromMe) {
        playNotificationSound()
        // Callback for badge/notification updates
        if (onNewMessage) {
          onNewMessage(payload)
        }
      }
    }
    
    // Handle read receipts - update message status to 'seen'
    const onMessageRead = (payload) => {
      if (!payload?.conversationId || payload.conversationId !== convRef.current) return
      const { receipt } = payload
      if (receipt?.message_id) {
        setMessages((m) => m.map(msg => 
          msg.id === receipt.message_id 
            ? { ...msg, status: 'seen', seen_at: receipt.read_at }
            : msg
        ))
      }
    }
    
    chatSocket.on('new_message', onNew)
    chatSocket.on('message_read', onMessageRead)
    
    return () => {
      chatSocket.off('new_message', onNew)
      chatSocket.off('message_read', onMessageRead)
    }
  }, [open, initialConversationId, user?.id, onNewMessage])

  const send = async () => {
    if (!conversationId) return
    if (!input.trim() && !selectedImage) return

    // Handle image upload
    if (selectedImage) {
      const imageData = await uploadImage()
      if (!imageData) return

      const tempId = `temp-${Date.now()}`
      chatSocket.sendMessage(
        conversationId,
        imageData.ciphertext,
        imageData.nonce,
        'image',
        tempId,
        imageData.attachmentUrl,
        imageData.attachmentType,
        imageData.fileSize
      )

      const optimistic = {
        id: tempId,
        ciphertext: imageData.ciphertext,
        nonce: imageData.nonce,
        content_type: 'image',
        attachment_url: imageData.attachmentUrl,
        attachment_type: imageData.attachmentType,
        file_size: imageData.fileSize,
        created_at: new Date().toISOString(),
        sender_id: user?.id
      }
      setMessages((m) => [...m, optimistic])
      pendingRef.current[tempId] = true
      clearImage()
      setTimeout(scrollToBottom, 50)
      return
    }

    // Handle text message
    const tempId = `temp-${Date.now()}`
    if (keyRef.current) {
      const { ciphertext, nonce } = encrypt(keyRef.current, input.trim())
      chatSocket.sendMessage(conversationId, ciphertext, nonce, 'text', tempId)
      const optimistic = { id: tempId, ciphertext, nonce, created_at: new Date().toISOString(), sender_id: user?.id }
      setMessages((m) => [...m, optimistic])
      pendingRef.current[tempId] = true
    } else {
      const plaintextB64 = btoa(input.trim())
      chatSocket.sendMessage(conversationId, plaintextB64, 'plain', 'text', tempId)
      const optimistic = { id: tempId, ciphertext: plaintextB64, nonce: 'plain', created_at: new Date().toISOString(), sender_id: user?.id }
      setMessages((m) => [...m, optimistic])
      pendingRef.current[tempId] = true
    }
    setInput('')
    setTimeout(scrollToBottom, 50)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('Image size must be less than 5MB')
      return
    }

    setSelectedImage(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const uploadImage = async () => {
    if (!selectedImage || !conversationId) return null

    try {
      setUploading(true)
      
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedImage.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Encrypt the image data
      let encryptedData, ciphertext, nonce
      if (keyRef.current) {
        const encrypted = encryptBinary(keyRef.current, uint8Array)
        ciphertext = encrypted.ciphertext
        nonce = encrypted.nonce
        // Decode the base64 ciphertext back to binary for upload
        encryptedData = fromBase64(ciphertext)
      } else {
        // Fallback: upload unencrypted (not recommended but for compatibility)
        encryptedData = uint8Array
        ciphertext = arrayBufferToBase64(arrayBuffer)
        nonce = 'plain'
      }

      // Generate message ID for storage path
      const messageId = `temp-${Date.now()}`
      const fileName = selectedImage.name
      const filePath = `${conversationId}/${messageId}-${fileName}`

      // Upload encrypted data to Supabase Storage
      // Use original MIME type so bucket accepts it
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, new Blob([encryptedData], { type: selectedImage.type }), {
          contentType: selectedImage.type,
          upsert: false
        })

      if (error) throw error

      // Return attachment metadata
      return {
        attachmentUrl: filePath,
        attachmentType: selectedImage.type,
        fileSize: selectedImage.size,
        ciphertext,
        nonce
      }
    } catch (error) {
      alert('Failed to upload image. Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`fixed right-6 bottom-6 w-96 z-50 transition-all duration-300 transform ${open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col h-[500px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-orange-600 flex justify-between items-center text-white shadow-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm">Support Chat</div>
              <div className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Online
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Trend */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 space-y-3 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <HelpCircle className="w-8 h-8 text-blue-500/50" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">How can we help you?</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Send us a message and we'll get back to you as soon as possible.</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageItem key={m.id} msg={m} keyB64={keyRef.current} meId={user?.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded-lg border-2 border-blue-500"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
            {/* Image Upload Button */}
            <input
              type="file"
              id="image-upload"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
            <label htmlFor="image-upload">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                asChild
              >
                <span className="cursor-pointer flex items-center justify-center">
                  <Image className="w-4 h-4" />
                </span>
              </Button>
            </label>
            
            <textarea
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm max-h-24 py-2 px-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={uploading}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={(!input.trim() && !selectedImage) || uploading}
              className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-[10px] text-center text-gray-400 mt-2">
            Messages are end-to-end encrypted
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageItem({ msg, keyB64, meId }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [expandedImage, setExpandedImage] = useState(false)

  // Load and decrypt image if message is an image type
  useEffect(() => {
    if (msg.content_type === 'image' && msg.attachment_url) {
      loadImage()
    }
  }, [msg])

  const loadImage = async () => {
    try {
      setImageLoading(true)
      setImageError(false)

      // Get signed URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .download(msg.attachment_url)

      if (error) throw error

      // Read the blob as ArrayBuffer
      const arrayBuffer = await data.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Decrypt if we have a key
      let decryptedData
      if (keyB64 && msg.nonce !== 'plain') {
        const decrypted = decryptBinary(keyB64, toBase64(uint8Array), msg.nonce)
        decryptedData = decrypted
      } else {
        decryptedData = uint8Array
      }

      // Create blob URL for display
      const blob = new Blob([decryptedData], { type: msg.attachment_type || 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setImageUrl(url)
    } catch (error) {
      setImageError(true)
    } finally {
      setImageLoading(false)
    }
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  // Handle text messages
  let text = ''
  if (msg.content_type === 'text') {
    if (keyB64) {
      text = decrypt(keyB64, msg.ciphertext, msg.nonce)
    } else {
      try {
        text = atob(msg.ciphertext)
      } catch {
        text = ''
      }
    }
  }

  const ts = new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const mine = msg.sender_id && meId && msg.sender_id === meId

  return (
    <>
      <div className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-2.5 shadow-sm text-sm break-words ${mine
              ? 'bg-gradient-to-br from-blue-600 to-orange-600 text-white rounded-2xl rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm'
              }`}
          >
            {msg.content_type === 'image' ? (
              <div className="flex flex-col gap-2">
                {imageLoading && (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                )}
                {imageError && (
                  <div className="w-48 h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-500 text-xs">Failed to load image</span>
                  </div>
                )}
                {imageUrl && !imageError && (
                  <img
                    src={imageUrl}
                    alt="Attachment"
                    className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setExpandedImage(true)}
                  />
                )}
                <div className="flex items-center justify-between gap-2">
                  {mine && (
                    <MessageStatus status={msg.status || 'delivered'} className="flex-shrink-0" />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-2">
                <span className="flex-1">{text}</span>
                {mine && (
                  <MessageStatus status={msg.status || 'delivered'} className="flex-shrink-0 self-end" />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 px-1">
            <span className="text-[10px] text-gray-400">{ts}</span>
          </div>
        </div>
      </div>

      {/* Image Expand Modal */}
      {expandedImage && imageUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            onClick={() => setExpandedImage(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt="Expanded"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// Message status indicator component
function MessageStatus({ status, className = '' }) {
  // status can be: 'sent', 'delivered', 'seen'
  const isSeen = status === 'seen';
  const isDelivered = status === 'delivered' || isSeen;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {isSeen ? (
        // Double check for seen (read)
        <CheckCheck className="w-3.5 h-3.5 text-blue-300" strokeWidth={2.5} />
      ) : isDelivered ? (
        // Single check for delivered
        <Check className="w-3.5 h-3.5 text-gray-300" strokeWidth={2.5} />
      ) : (
        // Faded check for sent but not delivered
        <Check className="w-3.5 h-3.5 text-gray-400 opacity-50" strokeWidth={2.5} />
      )}
    </div>
  );
}
