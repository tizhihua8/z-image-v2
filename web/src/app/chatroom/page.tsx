'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAuthStore } from '@/lib/store';
import { Send, Users, Wifi, WifiOff, Lock, Loader2, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
  id?: number;
  type: 'message' | 'system' | 'online_update' | 'delete';
  display_name?: string;
  avatar_url?: string;
  content: string;
  timestamp: string;
  is_admin?: boolean;
  online_count?: number;
  message_id?: number;
}

interface OnlineUser {
  display_name: string;
  username?: string;
  user_id?: number;
}

interface ActivityLog {
  type: 'join' | 'leave';
  display_name: string;
  username?: string;
  timestamp: string;
}

export default function ChatroomPage() {
  const { user, token, isHydrated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const isManualDisconnect = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载历史消息
  const loadHistory = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/chat/messages?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          type: 'message',
          display_name: msg.display_name,
          content: msg.content,
          timestamp: msg.timestamp,
        })));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  // WebSocket 连接
  const connectWebSocket = useCallback((anonymous: boolean) => {
    // 清除之前的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // 标记为手动断开，防止旧连接触发重连
    isManualDisconnect.current = true;
    
    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
    const wsBase = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const params = new URLSearchParams();
    // 总是发送token（用于管理员识别真实用户）
    if (token) {
      params.set('token', token);
    }
    // 匿名模式时设置随机昵称
    if (anonymous) {
      const randomId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      params.set('nickname', `游客${randomId}`);
    }
    
    const wsUrl = `${wsBase}/api/chat/ws?${params.toString()}`;
    
    // 延迟创建新连接，确保旧连接完全关闭
    setTimeout(() => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isManualDisconnect.current = false;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.online_count !== undefined) {
            setOnlineCount(data.online_count);
          }
          if (data.online_users) {
            setOnlineUsers(data.online_users);
          }
          // 处理活动日志（管理员可见）
          if (data.activity) {
            setActivityLogs(prev => [...prev.slice(-99), data.activity]);
          }
          // 处理历史活动日志
          if (data.activity_logs) {
            setActivityLogs(data.activity_logs);
          }
          // 处理不同消息类型
          if (data.type === 'online_update') {
            return;
          }
          if (data.type === 'delete' && data.message_id) {
            setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
            return;
          }
          if (data.type === 'message') {
            setMessages(prev => [...prev, data]);
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // 只有非手动断开时才自动重连
        if (!isManualDisconnect.current && wsRef.current === ws) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(anonymous);
          }, 3000);
        }
      };

      ws.onerror = () => {};
    }, 100);
  }, [token]);

  // 断开连接
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      isManualDisconnect.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // 自动加入
  useEffect(() => {
    if (isHydrated && user && !hasInitialized.current) {
      hasInitialized.current = true;
      setLoading(false);
      loadHistory();
      connectWebSocket(isAnonymous);
    } else if (isHydrated && !user) {
      setLoading(false);
    }
  }, [isHydrated, user, connectWebSocket, isAnonymous]);

  // 切换匿名模式时重连
  const handleToggleAnonymous = useCallback(() => {
    const newAnonymous = !isAnonymous;
    setIsAnonymous(newAnonymous);
    connectWebSocket(newAnonymous);
  }, [isAnonymous, connectWebSocket]);

  // 组件卸载时断开
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // 发送消息
  const handleSend = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ content: inputMessage.trim() }));
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp + 'Z');
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp + 'Z');
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 删除消息（管理员）
  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('确定要删除这条消息吗？')) return;
    try {
      await api.delete(`/api/chat/messages/${messageId}`);
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        </main>
      </div>
    );
  }

  // 未登录提示
  if (isHydrated && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <Lock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">需要登录</h2>
            <p className="text-white/40 mb-6">登录后即可加入实时聊天</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
            >
              立即登录
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col">
        {/* 标题区域 */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">实时聊天</h1>
              <p className="text-sm text-white/40 mt-2">
                与其他用户实时交流，分享创作心得
              </p>
            </div>
            
            {/* 状态信息 */}
            <div className="flex items-center gap-3">
              {/* 匿名切换 */}
              <button
                onClick={handleToggleAnonymous}
                disabled={!isConnected}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                  isAnonymous 
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                title={isAnonymous ? '当前匿名模式' : '切换到匿名模式'}
              >
                {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{isAnonymous ? '匿名中' : user?.username}</span>
              </button>
              
              {/* 在线人数（管理员可点击查看列表） */}
              {user?.is_admin ? (
                <button
                  onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">{onlineCount} 在线</span>
                  {showOnlineUsers ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <Users className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">{onlineCount} 在线</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">连接中...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* 管理员：在线用户列表 */}
          {user?.is_admin && showOnlineUsers && onlineUsers.length > 0 && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">在线用户</span>
                <button
                  onClick={() => setShowActivityLogs(!showActivityLogs)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {showActivityLogs ? '隐藏活动记录' : '查看活动记录'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.map((u, i) => (
                  <div key={i} className="px-2 py-1 bg-white/5 rounded-lg text-sm">
                    <span className="text-white/80">{u.display_name}</span>
                    {u.username && u.username !== u.display_name && (
                      <span className="text-white/40 ml-1">({u.username})</span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 活动记录 */}
              {showActivityLogs && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-sm font-medium text-white/60 block mb-2">活动记录（实时）</span>
                  {activityLogs.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {activityLogs.slice().reverse().map((log, i) => (
                        <div key={i} className="text-xs text-white/40">
                          <span className="text-white/30">{formatDateTime(log.timestamp)}</span>
                          {' '}
                          <span className={log.type === 'join' ? 'text-green-400/60' : 'text-red-400/60'}>
                            {log.display_name}
                            {log.username && log.username !== log.display_name && ` (${log.username})`}
                            {log.type === 'join' ? ' 加入' : ' 离开'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30">暂无活动记录，等待用户加入或离开...</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 聊天界面 */}
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/40">
                <p>暂无消息，发送第一条消息吧！</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index}>
                  {msg.type === 'message' && (
                    <div className="group flex items-start gap-3 hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors">
                      {msg.avatar_url ? (
                        <img 
                          src={msg.avatar_url} 
                          alt={msg.display_name || ''} 
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/20"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                          msg.is_admin ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }`}>
                          {msg.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold ${msg.is_admin ? 'text-yellow-400' : 'text-white'}`}>
                            {msg.display_name}
                          </span>
                          {msg.is_admin && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">管理员</span>
                          )}
                          <span className="text-xs text-white/30">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="text-white/80 mt-0.5 break-words">{msg.content}</p>
                      </div>
                      {/* 管理员删除按钮 */}
                      {user?.is_admin && msg.id && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id!)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          title="删除消息"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                maxLength={500}
                disabled={!isConnected}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!isConnected || !inputMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">发送</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
