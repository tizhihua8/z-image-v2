'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, updateUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在登录...');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('登录失败：未收到授权令牌');
      return;
    }

    // 保存 token 并获取用户信息
    const handleLogin = async () => {
      try {
        // 先保存 token
        localStorage.setItem('token', token);
        
        // 获取用户信息
        const userData = await authApi.getMe();
        
        // 更新状态
        setAuth(token, userData);
        updateUser(userData);
        
        setStatus('success');
        setMessage(`欢迎回来，${userData.nickname || userData.username}！`);
        
        // 1秒后跳转
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } catch (e) {
        console.error('Login callback error:', e);
        setStatus('error');
        setMessage('获取用户信息失败，请重试');
        localStorage.removeItem('token');
      }
    };

    handleLogin();
  }, [searchParams, router, setAuth, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
            <p className="mt-4 text-white/70">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="mt-4 text-white">{message}</p>
            <p className="mt-2 text-white/50 text-sm">正在跳转...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="mt-4 text-white">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              返回登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
        <p className="mt-4 text-white/70">正在登录...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackContent />
    </Suspense>
  );
}
