import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  ChevronLeft,
  Search,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Lock,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage as apiSendMessage,
  getPickupCoordination,
  updatePickupCoordination,
} from '../services/chatService';
import { animateEntrance, animateNewMessage, prefersReducedMotion } from '../utils/motion';
import Button from '../components/common/Button';

export default function ChatPage() {
  const { user, token } = useAuth();
  const { socket, setUnreadChatCount } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookingId: routeBookingId } = useParams();
  const navigate = useNavigate();

  // Query parameter support: ?booking=ID or /chat/:bookingId
  const initialBookingId = routeBookingId || searchParams.get('booking') || null;

  const [conversations, setConversations] = useState([]);
  const [activeBookingId, setActiveBookingId] = useState(initialBookingId);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Error States
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  // Pickup Coordination State
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupData, setPickupData] = useState(null);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isSavingPickup, setIsSavingPickup] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState('');
  const [pickupForm, setPickupForm] = useState({
    exactLocation: '',
    instructions: '',
    targetTime: '',
    phone: '',
    sharePhone: false,
  });

  // Typing indicator state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // DOM Refs for auto-scroll and GSAP animations
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const pickupPanelRef = useRef(null);

  const currentUserId = user?._id || user?.id;

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Fetch all user conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    setIsLoadingConversations(true);
    try {
      const res = await getConversations(token);
      if (res?.data) {
        setConversations(res.data);
        // Calculate and update global unread count
        const total = res.data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch (err) {
      setChatError(err.message || 'Could not load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [token, setUnreadChatCount]);

  // Load conversation details and messages for active booking
  const loadActiveChat = useCallback(
    async (bookingId) => {
      if (!token || !bookingId) return;

      setIsLoadingMessages(true);
      setChatError('');
      try {
        const [convRes, msgRes] = await Promise.all([
          getConversation(bookingId, token),
          getMessages(bookingId, token),
        ]);

        if (convRes?.data) {
          setActiveConversation(convRes.data);
        }
        if (msgRes?.data) {
          setMessages(msgRes.data);
          setTimeout(() => scrollToBottom(false), 50);
        }

        // Decrement local conversation unread
        setConversations((prev) =>
          prev.map((c) =>
            (c.booking?._id || c.booking) === bookingId ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err) {
        setChatError(err.message || 'Failed to load conversation messages');
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [token, scrollToBottom]
  );

  // Load pickup coordination details
  const loadPickupDetails = useCallback(
    async (bookingId) => {
      if (!token || !bookingId) return;
      setIsLoadingPickup(true);
      try {
        const res = await getPickupCoordination(bookingId, token);
        if (res?.data) {
          setPickupData(res.data);
          setPickupForm({
            exactLocation: res.data.exactLocation || '',
            instructions: res.data.instructions || '',
            targetTime: res.data.targetTime
              ? new Date(res.data.targetTime).toISOString().slice(0, 16)
              : '',
            phone: res.data.myPhone || '',
            sharePhone: Boolean(res.data.myPhoneShared),
          });
        }
      } catch {
        // Non-blocking
      } finally {
        setIsLoadingPickup(false);
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // When activeBookingId changes, load messages and pickup details
  useEffect(() => {
    if (activeBookingId) {
      loadActiveChat(activeBookingId);
      loadPickupDetails(activeBookingId);
    } else {
      setActiveConversation(null);
      setMessages([]);
      setPickupData(null);
    }
  }, [activeBookingId, loadActiveChat, loadPickupDetails]);

  // Subtle GSAP entrance on mount
  useEffect(() => {
    if (chatContainerRef.current) {
      animateEntrance(chatContainerRef.current, { y: 10, duration: 0.35 });
    }
  }, []);

  // Real-Time Socket.IO Listeners for Incoming Messages, Reads, and Typing
  useEffect(() => {
    if (!socket) return;

    // Join active booking room if selected
    if (activeBookingId) {
      socket.emit('chat:join_booking', { bookingId: activeBookingId });
    }

    const handleIncomingMessage = (newMsg) => {
      if (!newMsg) return;

      const msgBookingId = (newMsg.booking?._id || newMsg.booking)?.toString();
      if (msgBookingId === activeBookingId) {
        setMessages((prev) => {
          const exists = prev.some((m) => (m._id || m.id) === (newMsg._id || newMsg.id));
          if (exists) return prev;
          return [...prev, newMsg];
        });

        // Trigger subtle animation on new message
        setTimeout(() => {
          if (lastMessageRef.current) {
            animateNewMessage(lastMessageRef.current);
          }
          scrollToBottom(true);
        }, 30);

        // If message is from other user and chat is open, mark as read
        const senderId = (newMsg.sender?._id || newMsg.sender)?.toString();
        if (senderId !== currentUserId) {
          getMessages(activeBookingId, token).catch(() => {});
        }
      }

      // Update conversation list preview
      setConversations((prev) =>
        prev.map((c) => {
          const cBookingId = (c.booking?._id || c.booking)?.toString();
          if (cBookingId === msgBookingId) {
            const isCurrentChat = msgBookingId === activeBookingId;
            return {
              ...c,
              lastMessage: {
                text: newMsg.text,
                sentAt: newMsg.createdAt || new Date(),
                sender: newMsg.sender,
              },
              unreadCount: isCurrentChat ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    };

    const handleReadStatus = (data) => {
      if (data?.bookingId === activeBookingId) {
        setMessages((prev) =>
          prev.map((m) => (m.recipient === data.readBy ? { ...m, isRead: true } : m))
        );
      }
    };

    const handleTypingEvent = (data) => {
      if (data?.bookingId === activeBookingId && data?.userId !== currentUserId) {
        setIsOtherUserTyping(data.isTyping);
      }
    };

    const handlePickupUpdated = (data) => {
      if (data?.bookingId === activeBookingId) {
        loadPickupDetails(activeBookingId);
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:read', handleReadStatus);
    socket.on('chat:user_typing', handleTypingEvent);
    socket.on('chat:pickup_updated', handlePickupUpdated);

    return () => {
      if (activeBookingId) {
        socket.emit('chat:leave_booking', { bookingId: activeBookingId });
      }
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:read', handleReadStatus);
      socket.off('chat:user_typing', handleTypingEvent);
      socket.off('chat:pickup_updated', handlePickupUpdated);
    };
  }, [socket, activeBookingId, currentUserId, token, scrollToBottom, loadPickupDetails]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (!socket || !activeBookingId || !otherParticipant) return;

    // Emit typing true
    socket.emit('chat:typing', {
      bookingId: activeBookingId,
      recipientId: otherParticipant._id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', {
        bookingId: activeBookingId,
        recipientId: otherParticipant._id,
        isTyping: false,
      });
    }, 1500);
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || isSending || !activeBookingId) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      const res = await apiSendMessage(activeBookingId, textToSend, token);
      if (res?.data) {
        setMessages((prev) => {
          const exists = prev.some((m) => (m._id || m.id) === (res.data._id || res.data.id));
          if (exists) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => {
          if (lastMessageRef.current) {
            animateNewMessage(lastMessageRef.current);
          }
          scrollToBottom(true);
        }, 20);
      }
    } catch (err) {
      setChatError(err.message || 'Failed to send message');
      setMessageText(textToSend); // Restore if failed
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Save pickup coordination details
  const handleSavePickup = async (e) => {
    e.preventDefault();
    if (!activeBookingId) return;

    setIsSavingPickup(true);
    setPickupSuccess('');
    try {
      const payload = {
        exactLocation: pickupForm.exactLocation,
        instructions: pickupForm.instructions,
        targetTime: pickupForm.targetTime || null,
        ownerPhone: pickupForm.phone,
        requesterPhone: pickupForm.phone,
        sharePhoneWithRequester: pickupForm.sharePhone,
        sharePhoneWithOwner: pickupForm.sharePhone,
      };

      const res = await updatePickupCoordination(activeBookingId, payload, token);
      if (res?.data) {
        setPickupData(res.data);
        setPickupSuccess('Pickup details updated and shared securely.');
        setTimeout(() => setPickupSuccess(''), 4000);
      }
    } catch (err) {
      setChatError(err.message || 'Could not update pickup coordination');
    } finally {
      setIsSavingPickup(false);
    }
  };

  // Select conversation
  const handleSelectConversation = (bookingId) => {
    setActiveBookingId(bookingId);
    setSearchParams({ booking: bookingId });
  };

  // Find other participant in active conversation
  const otherParticipant = activeConversation?.participants?.find(
    (p) => (p._id || p.id)?.toString() !== currentUserId
  );

  // Check if current user is owner of active booking
  const isOwner =
    activeConversation?.booking?.owner
      ? (activeConversation.booking.owner._id || activeConversation.booking.owner)?.toString() === currentUserId
      : false;

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const resTitle = (c.resource?.title || '').toLowerCase();
    const other = c.participants?.find((p) => (p._id || p.id)?.toString() !== currentUserId);
    const participantName = (other?.name || '').toLowerCase();
    return resTitle.includes(q) || participantName.includes(q);
  });

  // Quick coordination prompts
  const quickPrompts = [
    'Hi! When would be a convenient time for equipment pickup?',
    'I have arrived at the designated pickup location.',
    'The equipment is inspected, packed, and ready for collection.',
    'Thank you! Handover completed successfully.',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Breadcrumb & Title */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/dashboard" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">In-App Chat & Pickup Coordination</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <span>Borrower & Owner Communications</span>
          </h1>
        </div>
      </div>

      {/* Main Container */}
      <div
        ref={chatContainerRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl flex flex-col md:flex-row h-[78vh] min-h-[550px]"
      >
        {/* LEFT PANE: Conversations Inbox */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col shrink-0 ${
            activeBookingId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Inbox Search Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-850">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-400" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No conversations found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600">
                  When you submit or receive a booking request, a dedicated chat is created here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const bookingId = (conv.booking?._id || conv.booking)?.toString();
                const isSelected = bookingId === activeBookingId;
                const other = conv.participants?.find(
                  (p) => (p._id || p.id)?.toString() !== currentUserId
                );
                const hasUnread = conv.unreadCount > 0;

                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => handleSelectConversation(bookingId)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-slate-100 dark:hover:bg-slate-850/50 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-600/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                    }`}
                  >
                    {/* Resource Thumbnail / Icon */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                      {conv.resource?.images?.[0] ? (
                        <img
                          src={conv.resource.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-blue-400" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {other?.name || 'Academic Member'}
                        </span>
                        {conv.lastMessage?.sentAt && (
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(conv.lastMessage.sentAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mb-1">
                        {conv.resource?.title || 'Shared Resource'}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate flex-1">
                          {conv.lastMessage?.text || 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-full shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Active Chat & Coordination Pane */}
        <main className={`flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 ${!activeBookingId ? 'hidden md:flex' : 'flex'}`}>
          {!activeBookingId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-7 h-7 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Select a Booking Conversation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Coordinate handovers, ask equipment-specific questions, or arrange pickup timing safely with the other party.
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBookingId(null);
                      setSearchParams({});
                    }}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 font-bold text-xs">
                    {(otherParticipant?.name || 'A')[0]}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {otherParticipant?.name || 'Coordinating Member'}
                      </h2>
                      {activeConversation?.bookingStatus && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {activeConversation.bookingStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {activeConversation?.resource?.title || 'Resource'}
                    </p>
                  </div>
                </div>

                {/* Pickup Coordination Drawer Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickupOpen(!pickupOpen)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      pickupOpen
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pickup Details</span>
                    {pickupData && !pickupData.isLocked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE PICKUP COORDINATION DRAWER */}
              {pickupOpen && (
                <div
                  ref={pickupPanelRef}
                  className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 transition-all"
                >
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Pickup & Handover Coordination
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {pickupData?.isLocked ? 'Locked until approval' : 'Private to booking participants'}
                      </span>
                    </div>

                    {isLoadingPickup ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-400 mb-1" />
                        Loading coordination details...
                      </div>
                    ) : pickupData?.isLocked ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          {pickupData.message ||
                            'Pickup location and contact details unlock once this reservation is approved.'}
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleSavePickup} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Exact Location */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Exact Pickup Location {isOwner && <span className="text-blue-400">*</span>}
                            </label>
                            {isOwner ? (
                              <input
                                type="text"
                                placeholder="e.g. Room 402, Science Block, 4th Floor"
                                value={pickupForm.exactLocation}
                                onChange={(e) =>
                                  setPickupForm({ ...pickupForm, exactLocation: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />
                            ) : (
                              <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs text-slate-800 dark:text-slate-300">
                                {pickupData?.exactLocation || 'To be specified by custodian'}
                              </div>
                            )}
                          </div>

                          {/* Target Pickup Time */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Target Pickup Window
                            </label>
                            <input
                              type="datetime-local"
                              value={pickupForm.targetTime}
                              onChange={(e) =>
                                setPickupForm({ ...pickupForm, targetTime: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Handover Instructions */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Pickup & Access Instructions
                          </label>
                          {isOwner ? (
                            <textarea
                              rows={2}
                              placeholder="e.g. Bring university ID card; ask for lab technician at reception"
                              value={pickupForm.instructions}
                              onChange={(e) =>
                                setPickupForm({ ...pickupForm, instructions: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                            />
                          ) : (
                            <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs text-slate-800 dark:text-slate-300">
                              {pickupData?.instructions || 'Standard departmental collection guidelines apply.'}
                            </div>
                          )}
                        </div>

                        {/* Shared Contact Phone Section */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-blue-400" />
                              <span>Direct Contact Phone (Optional)</span>
                            </span>
                            {pickupData?.sharedContactPhone ? (
                              <p className="text-xs text-emerald-300 font-mono flex items-center gap-2">
                                <span>{pickupData.sharedContactPhone}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(pickupData.sharedContactPhone)}
                                  className="text-[10px] text-slate-400 hover:text-white inline-flex items-center gap-0.5"
                                  title="Copy phone"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500">
                                Contact phone not shared by other party. You can coordinate fully via chat.
                              </p>
                            )}
                          </div>

                          {/* My Phone Input & Opt-in Checkbox */}
                          <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                            <input
                              type="tel"
                              placeholder="Your phone number"
                              value={pickupForm.phone}
                              onChange={(e) => setPickupForm({ ...pickupForm, phone: e.target.value })}
                              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                            />
                            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={pickupForm.sharePhone}
                                onChange={(e) =>
                                  setPickupForm({ ...pickupForm, sharePhone: e.target.checked })
                                }
                                className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                              />
                              <span>Share my phone with {isOwner ? 'borrower' : 'custodian'}</span>
                            </label>
                          </div>
                        </div>

                        {pickupSuccess && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{pickupSuccess}</span>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSavingPickup}
                            icon={isSavingPickup ? Loader2 : Check}
                          >
                            {isSavingPickup ? 'Saving...' : 'Update Coordination Details'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Message Feed Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-400" />
                    <p className="text-xs">Loading message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">No messages in this conversation yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Use the quick prompts below or write a custom message to confirm pickup timing.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine =
                      (msg.sender?._id || msg.sender)?.toString() === currentUserId;
                    const isLast = idx === messages.length - 1;

                    return (
                      <div
                        key={msg._id || idx}
                        ref={isLast ? lastMessageRef : null}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>

                        {/* Timestamp & Read Receipt */}
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {isMine && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" title="Read" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-400 dark:text-slate-500" title="Delivered" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Live Typing Indicator */}
                {isOtherUserTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 italic py-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>{otherParticipant?.name || 'Other party'} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Error Banner */}
              {chatError && (
                <div className="mx-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span>{chatError}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setChatError('')}
                    className="text-xs text-rose-600 dark:text-rose-300 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quick Coordination Templates */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessageText(prompt)}
                    className="px-3 py-1 rounded-full bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 transition-colors shadow-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-3 shrink-0"
              >
                <div className="flex-1 min-w-0 relative">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                    maxLength={2000}
                    className="w-full pl-4 pr-16 sm:pr-20 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 resize-none min-h-[48px] max-h-32 transition-colors leading-relaxed"
                  />
                  <span className="absolute right-3 bottom-3 text-[10px] font-medium text-slate-400 dark:text-slate-500 select-none pointer-events-none">
                    {messageText.length}/2000
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-blue-600/25 active:scale-95 flex items-center justify-center shrink-0 self-end focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  title="Send message"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : (
                    <Send className="w-5 h-5 shrink-0" />
                  )}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

