'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, User, LogOut, Settings, Shield, Star, Menu, X, Home, Image, Users, MessageCircle, Server } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { workersApi } from '@/lib/api';

// Trust Level 配置
const TRUST_LEVEL_CONFIG: Record<number, { name: string; color: string; quota: number }> = {
  0: { name: '新用户', color: 'text-gray-400', quota: 1 },
  1: { name: '基础用户', color: 'text-gray-400', quota: 1 },
  2: { name: '成员', color: 'text-blue-400', quota: 5 },
  3: { name: '常规', color: 'text-green-400', quota: 20 },
  4: { name: '领导者', color: 'text-purple-400', quota: 20 },
};

export default function Header() {
  const { user, logout } = useAuthStore();
  const [onlineCount, setOnlineCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await workersApi.list();
        setOnlineCount(data.online_count || 0);
      } catch {
        setOnlineCount(0);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // 关闭菜单
  const closeMenus = () => {
    setShowMenu(false);
    setShowMobileNav(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" onClick={closeMenus}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              RyanVan Z-Image
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
              创建作品
            </Link>
            {user && (
              <Link href="/my-works" className="text-sm text-white/60 hover:text-white transition-colors">
                我的作品
              </Link>
            )}
            <Link href="/gallery" className="text-sm text-white/60 hover:text-white transition-colors">
              作品广场
            </Link>
            <Link href="/chatroom" className="text-sm text-white/60 hover:text-white transition-colors">
              实时聊天
            </Link>
            {user?.is_admin && (
              <Link href="/admin" className="text-sm text-white/60 hover:text-white transition-colors">
                管理后台
              </Link>
            )}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 服务状态 - 可点击 */}
            <Link
              href="/workers"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'}`} />
              <span className="text-xs text-white/60">
                {onlineCount > 0 ? `在线服务器: ${onlineCount}` : '服务离线'}
              </span>
            </Link>
            
            {/* 移动端服务状态 - 可点击 */}
            <Link href="/workers" className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'}`} />
              <span className="text-xs text-white/50">{onlineCount}</span>
            </Link>

            {/* 用户 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {/* 用户头像 */}
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">{user.nickname || user.username}</div>
                    <div className="text-xs text-white/40">
                      {user.remaining_quota}/{user.daily_quota} 张
                    </div>
                  </div>
                </button>

                {showMenu && (
                  <>
                    {/* 背景遮罩 */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 py-2 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-xl z-50">
                      {/* 用户信息卡片 */}
                      <div className="px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-12 h-12 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium">{user.nickname || user.username}</div>
                            <div className="text-xs text-white/40">@{user.username}</div>
                          </div>
                        </div>
                        
                        {/* 等级和配额 */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-xs ${TRUST_LEVEL_CONFIG[user.trust_level]?.color || 'text-gray-400'}`}>
                            <Star className="w-3 h-3" />
                            <span>Lv.{user.trust_level} {TRUST_LEVEL_CONFIG[user.trust_level]?.name || '用户'}</span>
                          </div>
                          {user.is_admin && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-xs text-red-400">
                              <Shield className="w-3 h-3" />
                              <span>管理员</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 配额信息 */}
                        <div className="mt-2 text-xs text-white/60">
                          今日配额: <span className="text-white">{user.remaining_quota}</span> / {user.daily_quota} 张
                          <span className="text-white/40 ml-2">
                            (累计 {user.total_generations} 张)
                          </span>
                        </div>
                      </div>
                      
                      {user.is_admin && (
                        <Link
                          href="/admin"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5"
                        >
                          <Settings className="w-4 h-4" />
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 sm:px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                登录
              </Link>
            )}

            {/* 移动端汉堡菜单按钮 */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {showMobileNav ? (
                <X className="w-5 h-5 text-white/60" />
              ) : (
                <Menu className="w-5 h-5 text-white/60" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {showMobileNav && (
          <div className="md:hidden border-t border-white/10 py-4">
            <nav className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={closeMenus}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                创建作品
              </Link>
              {user && (
                <Link
                  href="/my-works"
                  onClick={closeMenus}
                  className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Image className="w-5 h-5" />
                  我的作品
                </Link>
              )}
              <Link
                href="/gallery"
                onClick={closeMenus}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                作品广场
              </Link>
              <Link
                href="/chatroom"
                onClick={closeMenus}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                实时聊天
              </Link>
              {user?.is_admin && (
                <Link
                  href="/admin"
                  onClick={closeMenus}
                  className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  管理后台
                </Link>
              )}
              
              {/* 移动端服务状态 */}
              <Link
                href="/workers"
                onClick={closeMenus}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Server className="w-5 h-5" />
                <span className="text-sm">
                  {onlineCount > 0 ? `在线服务器: ${onlineCount}` : '服务离线'}
                </span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
