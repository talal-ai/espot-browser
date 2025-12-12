import { io, Socket } from 'socket.io-client'
import { API_CONFIG } from '../../../config/api.config'

type Events = {
  new_message: (payload: any) => void
  message_read: (payload: any) => void
  typing: (payload: any) => void
}

class ChatSocket {
  private socket: Socket | null = null
  connect() {
    if (this.socket) return
    const token = localStorage.getItem('auth_token') || ''
    this.socket = io(API_CONFIG.baseURL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    })
  }
  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }
  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', { conversationId })
  }
  sendMessage(conversationId: string, ciphertext: string, nonce: string, contentType: string = 'text', tempId?: string) {
    this.socket?.emit('message', { conversationId, ciphertext, nonce, contentType, tempId })
  }
  readReceipt(conversationId: string, messageId: string) {
    this.socket?.emit('read_receipt', { conversationId, messageId })
  }
  typing(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping })
  }
  on<K extends keyof Events>(event: K, handler: Events[K]) {
    this.socket?.on(event, handler as any)
  }
  off<K extends keyof Events>(event: K, handler: Events[K]) {
    this.socket?.off(event, handler as any)
  }
}

export const chatSocket = new ChatSocket()
