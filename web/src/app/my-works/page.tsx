'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';
import { useAuthStore } from '@/lib/store';
import { jobsApi, type Job } from '@/lib/api';
import { ImageIcon, Loader2, ChevronLeft, ChevronRight, Clock, Check, X, Loader, Search } from 'lucide-react';

// 状态配置
const statusConfig = {
  queued: { icon: Clock, label: '排队中', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  running: { icon: Loader, label: '生成中', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  done: { icon: Check, label: '完成', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  failed: { icon: X, label: '失败', color: 'text-red-400', bg: 'bg-red-400/10' },
  cancelled: { icon: X, label: '已取消', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

export default function MyWorksPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // 检查登录状态（等待 hydration 完成）
  useEffect(() => {
    if (isHydrated && !user) {
      router.push('/login');
    }
  }, [user, isHydrated, router]);

  // 加载数据（等待 hydration 完成）
  useEffect(() => {
    if (!isHydrated || !user) return;
    
    const loadJobs = async () => {
      setLoading(true);
      try {
        const data = await jobsApi.list(page, 18);
        let filteredJobs = data.jobs;
        
        // 前端过滤 - 搜索
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredJobs = filteredJobs.filter(j => j.prompt.toLowerCase().includes(query));
        }
        
        setJobs(filteredJobs);
        setTotalPages(data.total_pages);
      } catch (e) {
        console.error('Failed to load jobs', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadJobs();
  }, [user, isHydrated, page, searchQuery]);

  // 只在有进行中任务时才自动刷新
  useEffect(() => {
    const hasPendingJobs = jobs.some(j => j.status === 'queued' || j.status === 'running');
    if (!hasPendingJobs) return;

    const interval = setInterval(async () => {
      try {
        const data = await jobsApi.list(page, 20);
        setJobs(data.jobs);
      } catch (e) {
        console.error('Failed to refresh jobs', e);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [jobs, page]);

  // 等待 hydration 或未登录时显示加载
  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">我的作品</h1>
          <p className="text-sm text-white/40 mt-2">查看和管理你的所有生成作品</p>
        </div>

        {/* 搜索和分页 */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const p = parseInt(e.target.value) || 1;
                    if (p >= 1 && p <= totalPages) setPage(p);
                  }}
                  className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-white/40 text-sm">/ {totalPages}</span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : jobs.length > 0 ? (
          <>
            {/* Grid - 自适应 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {jobs.map((job) => {
                // 已完成的任务使用 ImageCard
                if (job.status === 'done' && job.image_url) {
                  return (
                    <ImageCard
                      key={job.id}
                      imageUrl={job.image_url}
                      prompt={job.prompt}
                      width={job.width}
                      height={job.height}
                      createdAt={job.created_at}
                      jobId={job.id}
                      isPublic={job.is_public}
                      onPublish={async (anonymous) => {
                        try {
                          await jobsApi.publish(job.id, anonymous);
                          // 刷新列表
                          const data = await jobsApi.list(page, 18);
                          setJobs(data.jobs);
                        } catch (e) {
                          console.error('Failed to publish', e);
                        }
                      }}
                      onUnpublish={async () => {
                        try {
                          await jobsApi.unpublish(job.id);
                          // 刷新列表
                          const data = await jobsApi.list(page, 18);
                          setJobs(data.jobs);
                        } catch (e) {
                          console.error('Failed to unpublish', e);
                        }
                      }}
                      onDelete={async () => {
                        try {
                          await jobsApi.delete(job.id);
                          // 刷新列表
                          const data = await jobsApi.list(page, 18);
                          setJobs(data.jobs);
                          setTotalPages(data.total_pages);
                        } catch (e) {
                          console.error('Failed to delete', e);
                        }
                      }}
                    />
                  );
                }

                // 其他状态显示状态卡片
                const config = statusConfig[job.status as keyof typeof statusConfig];
                const Icon = config?.icon || Clock;
                
                return (
                  <div
                    key={job.id}
                    className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden"
                  >
                    <div className="aspect-square bg-black flex flex-col items-center justify-center gap-3">
                      <div className={`p-4 rounded-full ${config?.bg || 'bg-gray-400/10'}`}>
                        <Icon className={`w-8 h-8 ${config?.color || 'text-gray-400'} ${job.status === 'running' ? 'animate-spin' : ''}`} />
                      </div>
                      <span className={`text-sm ${config?.color || 'text-gray-400'}`}>
                        {config?.label || job.status}
                      </span>
                      {job.queue_position && job.status === 'queued' && (
                        <span className="text-xs text-white/40">队列位置: #{job.queue_position}</span>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <span className="text-xs text-red-400/60 px-4 text-center line-clamp-2">
                          {job.error_message}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-white/80 line-clamp-2 mb-2" title={job.prompt}>
                        {job.prompt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{job.width}×{job.height}</span>
                        <span>{formatTime(job.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 底部分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const p = parseInt(e.target.value) || 1;
                      if (p >= 1 && p <= totalPages) setPage(p);
                    }}
                    className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-white/40 text-sm">/ {totalPages}</span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">暂无作品</p>
            <p className="text-sm text-white/20 mt-2">前往创建作品开始生成</p>
          </div>
        )}
      </main>
    </div>
  );
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  
  return date.toLocaleDateString();
}


