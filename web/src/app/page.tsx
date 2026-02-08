'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GenerateForm from '@/components/GenerateForm';
import JobCard from '@/components/JobCard';
import { useAuthStore } from '@/lib/store';
import { authApi, jobsApi, galleryApi, type Job } from '@/lib/api';
import { ImageIcon, Users, Sparkles } from 'lucide-react';

export default function Home() {
  const { user, updateUser } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ total_images: 0, total_users: 0, today_images: 0 });

  // 自动登录（开发模式）
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token && !user) {
        try {
          const userData = await authApi.getMe();
          updateUser(userData);
        } catch {
          localStorage.removeItem('token');
        }
      }
    };
    init();
  }, [user, updateUser]);

  // 加载用户任务
  useEffect(() => {
    if (user) {
      jobsApi.list().then(data => setJobs(data.jobs)).catch(console.error);
    }
  }, [user]);

  // 加载统计
  useEffect(() => {
    galleryApi.stats().then(setStats).catch(console.error);
  }, []);

  const handleJobCreated = (job: Job) => {
    setJobs((prev) => [job, ...(prev || [])]);
    if (user) {
      updateUser({ ...user, remaining_quota: user.remaining_quota - 1 });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              AI 图像生成
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            基于 Z-Image-Turbo 模型，快速生成高质量图像
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12 max-w-xl mx-auto">
          <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
            <ImageIcon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total_images}</div>
            <div className="text-xs text-white/40">总生成数</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <div className="text-xs text-white/40">用户数</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
            <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.today_images}</div>
            <div className="text-xs text-white/40">今日生成</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Generate Form */}
          <div>
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                创建作品
              </h2>
              
              {user ? (
                <GenerateForm onJobCreated={handleJobCreated} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/50 mb-4">登录后即可开始创作</p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
                  >
                    立即登录
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right: My Jobs */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                历史作品
              </h2>
              {jobs.length > 0 && (
                <Link 
                  href="/my-works" 
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  查看全部
                </Link>
              )}
            </div>
            
            {jobs.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {jobs.slice(0, 4).map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onUpdate={(updated) => {
                        // 删除或取消时从列表移除
                        if (updated.status === 'cancelled') {
                          setJobs(prev => prev.filter(j => j.id !== job.id));
                        } else {
                          setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
                        }
                      }}
                    />
                  ))}
                </div>
                {jobs.length > 4 && (
                  <Link
                    href="/my-works"
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                  >
                    查看全部 {jobs.length} 个作品
                  </Link>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">还没有作品</p>
                <p className="text-sm text-white/20">创建你的第一张图像吧</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-white/30">
          Powered by Z-Image-Turbo
        </div>
      </footer>
    </div>
  );
}
