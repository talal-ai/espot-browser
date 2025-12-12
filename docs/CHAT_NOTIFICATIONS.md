# Chat Notification System

## Overview
A lightweight, non-intrusive notification system for the ESPOT Browser chat feature.

## Features

### 1. **Visual Badge Indicator**
- Red-orange gradient badge appears on "Conversations" menu item
- Shows total unread count (displays "9+" if more than 9)
- Pulse animation for attention
- Auto-clears when user clicks on Conversations

### 2. **Per-Conversation Badges (Admin Only)**
- Each conversation card shows a badge with unread count
- Red-orange "X New" badge for conversations with unread messages
- Green "Active" badge for conversations without new messages
- Badge on "Open Conversation" button shows count
- Auto-clears when admin opens that specific conversation

### 3. **Sound Notification**
- Simple beep sound using Web Audio API (no external files needed)
- 800Hz sine wave, 0.2s duration
- Plays only when you receive a message from someone else
- Non-intrusive volume (30%)

### 4. **Browser Notifications**
- Desktop notification appears if permission granted
- Shows sender name and message preview
- Only appears when message is from another user
- Auto-requests permission on first load

## How It Works

### Frontend (`use-chat-notifications.js`)
```javascript
const { unreadCount, clearNotifications } = useChatNotifications()
```

- Listens to socket `new_message` events
- Checks if sender is different from current user
- Increments counter, plays sound, shows notification
- Provides `clearNotifications()` to reset count

### Backend (`socket.py`)
- Emits `new_message` event with sender information
- Includes `sender.id`, `sender.username`, `sender.role`
- Allows frontend to identify if message is from another user

### Integration Points
1. **Sidebar.jsx** - Shows badge and clears on navigation
2. **ChatSocket.ts** - Handles real-time messaging
3. **Backend Socket** - Emits events with sender info

## Smart Features

✅ **No notifications for own messages** - Only notifies when others send messages  
✅ **Auto-clear on page visit** - Opening Conversations clears the badge  
✅ **Graceful degradation** - Works without notification permission  
✅ **No external dependencies** - Uses native Web Audio API  
✅ **Minimal overhead** - Single lightweight hook  

## User Experience

### For Users:
1. Receive message from admin → Beep + Badge appears
2. Click "Conversations" → Badge clears, chat opens
3. Read messages

### For Admins:
1. User sends message → Beep + Badge on "Conversations"  
2. Click "Conversations" → See all chats with badges  
3. Conversations with new messages show **"X New"** badge (red-orange)
4. Click "Open Conversation" → Badge clears for that conversation
5. Reply to user  

## Browser Compatibility
- **Sound**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Notifications**: Requires permission (optional feature)
- **Badge**: Pure CSS, works everywhere

## No Over-Engineering
- No complex state management libraries
- No notification service workers
- No database persistence for seen/unseen
- Just a simple counter that resets on page visit
- Clean, maintainable code

## Future Enhancements (Optional)
- Persist unread count in localStorage
- Add notification sound customization
- Show preview of latest message in notification
- Add "Mark all as read" button
