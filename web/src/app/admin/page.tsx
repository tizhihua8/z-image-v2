'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Image, Server, BarChart3, RefreshCw, 
  CheckCircle, XCircle, Clock, Loader2, Ban,
  Star, Shield, Search, ArrowUpDown, Eye, UserX, UserCheck, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';

// Trust Level 配置
const TRUST_LEVEL_CONFIG: Record<number, { name: string; color: string }> = {
  0: { name: '新用户', color: 'text-gray-400' },
  1: { name: '基础', color: 'text-gray-400' },
  2: { name: '成员', color: 'text-blue-400' },
  3: { name: '常规', color: 'text-green-400' },
  4: { name: '领导者', color: 'text-purple-400' },
};

interface AdminStats {
  total_users: number;
  total_jobs: number;
  total_completed: number;
  total_failed: number;
  today_jobs: number;
  online_workers: number;
  total_workers: number;
}

interface AdminUser {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  trust_level: number;
  is_admin: boolean;
  is_active: boolean;
  daily_quota: number;
  today_used_count: number;
  total_generations: number;
  created_at: string;
}

interface AdminJob {
  id: string;
  user: { id: number; username: string; nickname?: string; avatar_url?: string };
  status: string;
  prompt: string;
  width: number;
  height: number;
  worker_id: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
  is_public: boolean;
  is_deleted: boolean;
  elapsed_seconds: number | null;
  image_url: string | null;
}

interface AdminWorker {
  id: string;
  name: string;
  status: string;
  is_busy: boolean;
  current_job_id: string | null;
  gpu_info: { name: string; memory_gb: number } | null;
  last_seen_at: string;
}

interface UserJobsModal {
  user: { id: number; username: string; nickname: string | null; avatar_url: string | null };
  jobs: AdminJob[];
  total: number;
  page: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'jobs' | 'workers'>('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [workers, setWorkers] = useState<AdminWorker[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // 搜索和排序状态 - 任务
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'finished_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  
  // 搜索和排序状态 - 用户
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSortBy, setUserSortBy] = useState<'trust_level' | 'is_active' | 'today_used' | 'total_generations' | 'created_at'>('created_at');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const usersPerPage = 20;
  
  // 用户作品弹窗
  const [userJobsModal, setUserJobsModal] = useState<UserJobsModal | null>(null);
  const [loadingUserJobs, setLoadingUserJobs] = useState(false);

  // 检查权限
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
    } else if (!user.is_admin) {
      router.push('/');
    }
  }, [user, router, isHydrated]);

  // 加载数据
  const loadData = async () => {
    try {
      const statsRes = await api.get('/api/admin/stats').catch(() => null);
      if (statsRes) setStats(statsRes.data);
      
      const usersRes = await api.get('/api/admin/users?limit=10000').catch(() => null);
      if (usersRes) setUsers(usersRes.data.users || []);
      
      const workersRes = await api.get('/api/admin/workers').catch(() => null);
      if (workersRes) setWorkers(workersRes.data.workers || []);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  // 加载任务列表（支持搜索和排序）
  const loadJobs = async (page = 1, search = '', sort = sortBy, order = sortOrder) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '18',
        sort_by: sort,
        sort_order: order,
      });
      if (search) params.append('search', search);
      
      const res = await api.get(`/api/admin/jobs?${params}`);
      setJobs(res.data.jobs || []);
      setJobsTotal(res.data.total || 0);
      setJobsPage(page);
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (user?.is_admin) {
      loadData();
      loadJobs();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isHydrated]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'jobs') {
        loadJobs(1, searchQuery, sortBy, sortOrder);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, sortOrder, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeTab === 'jobs') {
      await loadJobs(jobsPage, searchQuery, sortBy, sortOrder);
    }
    setRefreshing(false);
  };

  // 封禁/解封用户
  const handleToggleBan = async (userId: number, currentlyActive: boolean) => {
    try {
      const endpoint = currentlyActive ? 'ban' : 'unban';
      await api.post(`/api/admin/users/${userId}/${endpoint}`);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || '操作失败');
    }
  };

  // 查看用户作品
  const handleViewUserJobs = async (userId: number) => {
    setLoadingUserJobs(true);
    try {
      const res = await api.get(`/api/admin/users/${userId}/jobs`);
      setUserJobsModal({
        user: res.data.user,
        jobs: res.data.jobs,
        total: res.data.total,
        page: 1,
      });
    } catch (e) {
      console.error('Failed to load user jobs:', e);
    } finally {
      setLoadingUserJobs(false);
    }
  };

  // 重试任务
  const handleRetryJob = async (jobId: string) => {
    try {
      await api.post(`/api/admin/jobs/${jobId}/retry`);
      await loadJobs(jobsPage, searchQuery, sortBy, sortOrder);
    } catch (e) {
      console.error('Failed to retry job:', e);
    }
  };

  // 取消任务
  const handleCancelJob = async (jobId: string) => {
    try {
      await api.post(`/api/admin/jobs/${jobId}/cancel`);
      await loadJobs(jobsPage, searchQuery, sortBy, sortOrder);
    } catch (e) {
      console.error('Failed to cancel job:', e);
    }
  };

  // 管理员取消发布
  const handleUnpublishJob = async (jobId: string) => {
    if (!confirm('确定要从作品广场移除这个作品吗？')) return;
    try {
      await api.post(`/api/admin/jobs/${jobId}/unpublish`);
      await loadJobs(jobsPage, searchQuery, sortBy, sortOrder);
    } catch (e) {
      console.error('Failed to unpublish job:', e);
    }
  };

  // 等待状态恢复
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">无权访问</h1>
            <p className="text-white/50">需要管理员权限</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    queued: { icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400', label: '排队中' },
    running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', label: '运行中' },
    done: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', label: '完成' },
    failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', label: '失败' },
    cancelled: { icon: <Ban className="w-4 h-4" />, color: 'text-gray-400', label: '已取消' },
  };

  const totalJobPages = Math.ceil(jobsTotal / 18);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">管理后台</h1>
            <p className="text-white/50 mt-1">系统管理和监控</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          {[
            { id: 'stats', icon: <BarChart3 className="w-4 h-4" />, label: '统计' },
            { id: 'users', icon: <Users className="w-4 h-4" />, label: '用户' },
            { id: 'jobs', icon: <Image className="w-4 h-4" />, label: '任务' },
            { id: 'workers', icon: <Server className="w-4 h-4" />, label: 'Worker' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* 统计 */}
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users />} label="总用户" value={stats.total_users} />
                <StatCard icon={<Image />} label="总任务" value={stats.total_jobs} />
                <StatCard icon={<CheckCircle />} label="已完成" value={stats.total_completed} color="text-green-400" />
                <StatCard icon={<XCircle />} label="失败" value={stats.total_failed} color="text-red-400" />
                <StatCard icon={<Clock />} label="今日任务" value={stats.today_jobs} color="text-yellow-400" />
                <StatCard 
                  icon={<Server />} 
                  label="在线 Worker" 
                  value={`${stats.online_workers}/${stats.total_workers}`} 
                  color={stats.online_workers > 0 ? 'text-green-400' : 'text-red-400'} 
                />
              </div>
            )}

            {/* 用户列表 */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* 搜索和排序栏 */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="搜索用户名..."
                      value={userSearchQuery}
                      onChange={(e) => { setUserSearchQuery(e.target.value); setUsersPage(1); }}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">排序:</span>
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value as typeof userSortBy)}
                      className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="created_at" className="bg-[#1a1a1a]">注册时间</option>
                      <option value="trust_level" className="bg-[#1a1a1a]">等级</option>
                      <option value="is_active" className="bg-[#1a1a1a]">状态</option>
                      <option value="today_used" className="bg-[#1a1a1a]">今日生成</option>
                      <option value="total_generations" className="bg-[#1a1a1a]">总生成</option>
                    </select>
                    <button
                      onClick={() => setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                      title={userSortOrder === 'asc' ? '升序' : '降序'}
                    >
                      <ArrowUpDown className={`w-4 h-4 ${userSortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </button>
                    {/* 翻页控件 */}
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                        disabled={usersPage <= 1}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={Math.ceil(usersTotal / usersPerPage) || 1}
                        value={usersPage}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 1 && val <= Math.ceil(usersTotal / usersPerPage)) {
                            setUsersPage(val);
                          }
                        }}
                        className="w-12 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-white/60">/ {Math.ceil(usersTotal / usersPerPage) || 1}</span>
                      <button
                        onClick={() => setUsersPage(p => Math.min(Math.ceil(usersTotal / usersPerPage), p + 1))}
                        disabled={usersPage >= Math.ceil(usersTotal / usersPerPage)}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">用户</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">等级</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">配额</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">总生成</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">注册时间</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/60">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(() => {
                          // 过滤和排序用户
                          let filteredUsers = users.filter(u => 
                            userSearchQuery === '' || 
                            u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            (u.nickname && u.nickname.toLowerCase().includes(userSearchQuery.toLowerCase()))
                          );
                          
                          // 排序
                          filteredUsers.sort((a, b) => {
                            let aVal: number | string | boolean = 0;
                            let bVal: number | string | boolean = 0;
                            
                            switch (userSortBy) {
                              case 'trust_level':
                                aVal = a.trust_level;
                                bVal = b.trust_level;
                                break;
                              case 'is_active':
                                aVal = a.is_active ? 1 : 0;
                                bVal = b.is_active ? 1 : 0;
                                break;
                              case 'today_used':
                                aVal = a.today_used_count;
                                bVal = b.today_used_count;
                                break;
                              case 'total_generations':
                                aVal = a.total_generations;
                                bVal = b.total_generations;
                                break;
                              case 'created_at':
                                aVal = new Date(a.created_at).getTime();
                                bVal = new Date(b.created_at).getTime();
                                break;
                            }
                            
                            if (userSortOrder === 'asc') {
                              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                            } else {
                              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                            }
                          });
                          
                          // 更新总数用于翻页
                          if (filteredUsers.length !== usersTotal) {
                            setTimeout(() => setUsersTotal(filteredUsers.length), 0);
                          }
                          
                          // 分页
                          const startIdx = (usersPage - 1) * usersPerPage;
                          const paginatedUsers = filteredUsers.slice(startIdx, startIdx + usersPerPage);
                          
                          return paginatedUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/5">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                      <Users className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {u.nickname || u.username}
                                      {u.is_admin && (
                                        <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">管理员</span>
                                      )}
                                      {!u.is_active && (
                                        <span className="px-1.5 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">已封禁</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-white/40">@{u.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 ${TRUST_LEVEL_CONFIG[u.trust_level]?.color || 'text-gray-400'}`}>
                                  <Star className="w-3 h-3" />
                                  Lv.{u.trust_level}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs rounded ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {u.is_active ? '正常' : '封禁'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">{u.today_used_count}/{u.daily_quota}</td>
                              <td className="px-4 py-3 text-sm">{u.total_generations}</td>
                              <td className="px-4 py-3 text-sm text-white/60">
                                {new Date(u.created_at + 'Z').toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleViewUserJobs(u.id)}
                                    className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded"
                                    title="查看作品"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {!u.is_admin && (
                                    <button
                                      onClick={() => handleToggleBan(u.id, u.is_active)}
                                      className={`p-1.5 rounded ${u.is_active ? 'text-red-400 hover:bg-red-500/20' : 'text-green-400 hover:bg-green-500/20'}`}
                                      title={u.is_active ? '封禁用户' : '解封用户'}
                                    >
                                      {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* 底部翻页控件 */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage <= 1}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm text-white/60">{usersPage} / {Math.ceil(usersTotal / usersPerPage) || 1}</span>
                    <button
                      onClick={() => setUsersPage(p => Math.min(Math.ceil(usersTotal / usersPerPage), p + 1))}
                      disabled={usersPage >= Math.ceil(usersTotal / usersPerPage)}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 任务列表 */}
            {activeTab === 'jobs' && (
              <div className="space-y-4">
                {/* 搜索、排序和分页 */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="搜索提示词或用户名..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {/* 分页控件 */}
                  {totalJobPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadJobs(jobsPage - 1, searchQuery, sortBy, sortOrder)}
                        disabled={jobsPage <= 1}
                        className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={totalJobPages}
                          value={jobsPage}
                          onChange={(e) => {
                            const p = parseInt(e.target.value) || 1;
                            if (p >= 1 && p <= totalJobPages) {
                              loadJobs(p, searchQuery, sortBy, sortOrder);
                            }
                          }}
                          className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-white/40 text-sm">/ {totalJobPages}</span>
                      </div>
                      <button
                        onClick={() => loadJobs(jobsPage + 1, searchQuery, sortBy, sortOrder)}
                        disabled={jobsPage >= totalJobPages}
                        className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 作品网格 - 自适应 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {jobs.map((job) => {
                    const config = statusConfig[job.status] || statusConfig.queued;
                    
                    // 已完成的任务使用 ImageCard
                    if (job.status === 'done' && job.image_url) {
                      return (
                        <div key={job.id} className="relative group/card">
                          <ImageCard
                            imageUrl={job.image_url}
                            prompt={job.prompt}
                            width={job.width}
                            height={job.height}
                            createdAt={job.created_at}
                            author={job.user}
                            showAuthor={true}
                          />
                          {/* 状态标识 */}
                          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                            {job.is_deleted && (
                              <span className="px-2 py-1 bg-red-600/80 rounded text-xs text-white">
                                已删除
                              </span>
                            )}
                            {job.is_public && (
                              <span className="px-2 py-1 bg-green-500/80 rounded text-xs text-white">
                                已发布
                              </span>
                            )}
                          </div>
                          {job.is_public && (
                            <button
                              onClick={() => handleUnpublishJob(job.id)}
                              className="absolute top-2 right-2 z-10 px-2 py-1 bg-red-600/80 hover:bg-red-500 rounded text-xs text-white opacity-0 group-hover/card:opacity-100 transition-opacity"
                            >
                              取消发布
                            </button>
                          )}
                        </div>
                      );
                    }
                    
                    // 未完成的任务显示状态
                    return (
                      <div key={job.id} className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden group">
                        <div className="aspect-square relative bg-white/5 flex items-center justify-center">
                          <div className="text-center">
                            <span className={`flex items-center justify-center gap-1 ${config.color}`}>
                              {config.icon}
                              {config.label}
                            </span>
                            {job.error_message && (
                              <p className="text-xs text-red-400 mt-2 px-2">{job.error_message}</p>
                            )}
                          </div>
                          {/* 管理操作按钮 */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {job.status === 'failed' && (
                              <button
                                onClick={() => handleRetryJob(job.id)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white"
                              >
                                重试
                              </button>
                            )}
                            {['queued', 'running'].includes(job.status) && (
                              <button
                                onClick={() => handleCancelJob(job.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
                              >
                                取消
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-white/60 line-clamp-2 mb-2" title={job.prompt}>
                            {job.prompt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-white/40">
                            <span>{job.width}×{job.height}</span>
                            <span>{new Date(job.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 底部分页 */}
                {totalJobPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => loadJobs(jobsPage - 1, searchQuery, sortBy, sortOrder)}
                      disabled={jobsPage <= 1}
                      className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={totalJobPages}
                        value={jobsPage}
                        onChange={(e) => {
                          const p = parseInt(e.target.value) || 1;
                          if (p >= 1 && p <= totalJobPages) {
                            loadJobs(p, searchQuery, sortBy, sortOrder);
                          }
                        }}
                        className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-white/40 text-sm">/ {totalJobPages}</span>
                    </div>
                    <button
                      onClick={() => loadJobs(jobsPage + 1, searchQuery, sortBy, sortOrder)}
                      disabled={jobsPage >= totalJobPages}
                      className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {jobs.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    {searchQuery ? '没有找到匹配的作品' : '暂无任务'}
                  </div>
                )}
              </div>
            )}

            {/* Worker 列表 */}
            {activeTab === 'workers' && (
              <div className="grid gap-4 md:grid-cols-2">
                {workers.map((worker) => (
                  <div key={worker.id} className="bg-[#141414] border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${worker.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div>
                          <h3 className="font-medium">{worker.name}</h3>
                          <p className="text-xs text-white/40">{worker.id}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${worker.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {worker.status === 'online' ? '在线' : '离线'}
                      </span>
                    </div>
                    {worker.gpu_info && (
                      <div className="text-sm text-white/60 mb-2">
                        GPU: {worker.gpu_info.name} ({worker.gpu_info.memory_gb}GB)
                      </div>
                    )}
                    <div className="text-sm text-white/40">
                      {worker.is_busy ? (
                        <span className="text-yellow-400">处理中: {worker.current_job_id?.slice(0, 8)}...</span>
                      ) : (
                        <span>空闲</span>
                      )}
                    </div>
                    <div className="text-xs text-white/30 mt-2">
                      最后心跳: {new Date(worker.last_seen_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {workers.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-white/40">暂无 Worker</div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 用户作品弹窗 */}
      {userJobsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setUserJobsModal(null)}>
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {userJobsModal.user.avatar_url ? (
                  <img src={userJobsModal.user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{userJobsModal.user.nickname || userJobsModal.user.username}</h3>
                  <p className="text-sm text-white/40">共 {userJobsModal.total} 个作品</p>
                </div>
              </div>
              <button onClick={() => setUserJobsModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 作品列表 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {userJobsModal.jobs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userJobsModal.jobs.map((job) => (
                    <div key={job.id} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                      {job.image_url ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${job.image_url}`}
                          alt={job.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                          {job.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/40">该用户还没有作品</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 统计卡片组件
function StatCard({ icon, label, value, color = 'text-white' }: { icon: React.ReactNode; label: string; value: number | string; color?: string; }) {
  return (
    <div className="bg-[#141414] border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-white/40">{icon}</div>
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
