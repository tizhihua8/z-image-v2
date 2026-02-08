'use client';

import { useState, useEffect } from 'react';
import { Server, RefreshCw, Cpu, HardDrive, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { workersApi, type WorkerStatus } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function WorkersPage() {
  const { user } = useAuthStore();
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchWorkers = async () => {
    try {
      const data = await workersApi.list();
      setWorkers(data.workers || []);
      setOnlineCount(data.online_count || 0);
    } catch (error) {
      console.error('获取 Worker 列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    // 每 10 秒刷新一次
    const interval = setInterval(fetchWorkers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWorkers();
  };

  const handleDelete = async (workerId: string) => {
    if (!confirm(`确定要删除 Worker "${workerId}" 吗？`)) return;
    
    setDeleting(workerId);
    try {
      await workersApi.delete(workerId);
      setWorkers(prev => prev.filter(w => w.id !== workerId));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，只能删除离线的 Worker');
    } finally {
      setDeleting(null);
    }
  };

  const formatLastSeen = (dateStr: string) => {
    // 服务器返回的是 UTC 时间，需要加 Z 后缀让浏览器正确解析
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 0) return '刚刚';
    if (diff < 60) return `${diff} 秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="w-6 h-6 text-indigo-400" />
              服务状态
            </h1>
            <p className="text-white/50 text-sm mt-1">
              当前在线 GPU 服务器状态
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{onlineCount}</div>
            <div className="text-sm text-white/50 mt-1">在线服务器</div>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white/60">{workers.length}</div>
            <div className="text-sm text-white/50 mt-1">总服务器数</div>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {workers.filter(w => w.status === 'online' && w.is_busy).length}
            </div>
            <div className="text-sm text-white/50 mt-1">正在工作</div>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">
              {workers.filter(w => w.status === 'online' && !w.is_busy).length}
            </div>
            <div className="text-sm text-white/50 mt-1">空闲等待</div>
          </div>
        </div>

        {/* Worker 列表 */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/40" />
            <p className="text-white/40 mt-2">加载中...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12 bg-[#141414] border border-white/10 rounded-xl">
            <Server className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">暂无服务器</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker) => {
              const isOnline = worker.status === 'online';
              const isBusy = isOnline && worker.is_busy;
              
              return (
                <div
                  key={worker.id}
                  className="bg-[#141414] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
                >
                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-xs text-white/40">{worker.id}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isOnline
                        ? isBusy
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isOnline ? (isBusy ? '工作中' : '空闲') : '离线'}
                    </span>
                  </div>

                  {/* GPU 信息 */}
                  {worker.gpu_info && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <span className="text-white/70">{worker.gpu_info.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <HardDrive className="w-4 h-4 text-purple-400" />
                        <span className="text-white/70">{worker.gpu_info.memory_gb} GB 显存</span>
                      </div>
                    </div>
                  )}

                  {/* 当前任务 */}
                  {isBusy && worker.current_job_id && (
                    <div className="text-xs text-amber-400 mb-3">
                      处理中: {worker.current_job_id.slice(0, 8)}...
                    </div>
                  )}

                  {/* 最后心跳 + 删除按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/30">
                      最后心跳: {formatLastSeen(worker.last_seen_at)}
                    </div>
                    {/* 管理员可删除离线的 Worker */}
                    {user?.is_admin && !isOnline && (
                      <button
                        onClick={() => handleDelete(worker.id)}
                        disabled={deleting === worker.id}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                        title="删除此 Worker"
                      >
                        <Trash2 className={`w-4 h-4 ${deleting === worker.id ? 'animate-pulse' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 说明 */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-sm font-medium text-white/70 mb-2">说明</h3>
          <ul className="text-xs text-white/50 space-y-1">
            <li>• 服务器状态每 10 秒自动刷新</li>
            <li>• <span className="text-emerald-400">空闲</span> 状态的服务器可以接受新任务</li>
            <li>• <span className="text-amber-400">工作中</span> 的服务器正在处理生图任务</li>
            <li>• <span className="text-red-400">离线</span> 的服务器超过 30 秒未发送心跳</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

