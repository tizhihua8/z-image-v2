'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const handleLinuxDoLogin = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    window.location.href = `${apiBase}/api/auth/login`;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setLoading(true);
    try {
      // 传递账号密码给后端验证
      const data = await authApi.devLogin(adminUsername, adminPassword);
      setAuth(data.access_token, data.user);
      const userData = await authApi.getMe();
      updateUser(userData);
      router.push('/');
    } catch (e: any) {
      console.error('Login failed', e);
      setError(e.response?.data?.detail || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-4">欢迎回来</h1>
          <p className="text-white/50 mt-2">登录以开始创作 AI 图像</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4">
          {/* Linux DO Login */}
          <button
            onClick={handleLinuxDoLogin}
            disabled={loading || !agreedTerms}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl text-white font-medium transition-colors"
          >
            <img 
              src="/icons/linuxdo.svg" 
              alt="Linux DO" 
              className="w-6 h-6 rounded-full"
            />
            使用 LINUX DO 登录
          </button>

          {/* 管理员登录分割线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <button 
                onClick={() => setShowAdminLogin(!showAdminLogin)}
                className="px-2 bg-[#141414] text-white/40 hover:text-white/60 transition-colors"
              >
                {showAdminLogin ? '收起管理员登录' : '管理员登录'}
              </button>
            </div>
          </div>

          {/* 管理员账号密码登录 */}
          {showAdminLogin && (
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="管理员账号"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="密码"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              
              <button
                type="submit"
                disabled={loading || !adminUsername || !adminPassword || !agreedTerms}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                管理员登录
              </button>
            </form>
          )}
        </div>

        {/* 服务条款同意 */}
        <label className="flex items-center justify-center gap-2 mt-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-white/40">
            我已阅读并同意{' '}
            <Link href="/terms" className="text-white/60 hover:text-white/80">
              服务条款与免责声明
            </Link>
          </span>
        </label>
      </div>
    </div>
  );
}
