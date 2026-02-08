// API 客户端
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，自动添加 token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 添加响应拦截器，处理 401 错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token 失效，清除本地存储并刷新页面
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 类型
export interface User {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  trust_level: number;  // Linux DO 信任等级 0-4
  daily_quota: number;
  today_used_count: number;
  remaining_quota: number;
  total_generations: number;
}

export interface Job {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  prompt: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
  image_url: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  elapsed_seconds: number | null;
  queue_position: number | null;
  queue_overload: boolean;
  is_public?: boolean;
  is_anonymous?: boolean;
}

export interface WorkerStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  is_busy: boolean;
  current_job_id: string | null;
  gpu_info: {
    name: string;
    memory_gb: number;
  } | null;
  last_seen_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  prompt: string;
  width: number;
  height: number;
  author: {
    username: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;  // 匿名时为 null
  created_at: string;
  seed: number | null;
  like_count: number;
  comment_count: number;
}

export interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  user: {
    username: string;
    nickname: string | null;
    avatar_url: string | null;
  };
}

// API 函数
export const authApi = {
  devLogin: async (username = 'dev_user', password?: string) => {
    const params = new URLSearchParams({ username });
    if (password) {
      params.append('password', password);
    }
    const res = await api.post(`/api/auth/dev-login?${params.toString()}`);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/api/auth/me');
    return res.data;
  },
};

export const jobsApi = {
  create: async (data: {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  }) => {
    const res = await api.post<Job>('/api/jobs', data);
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get<Job>(`/api/jobs/${id}`);
    return res.data;
  },
  list: async (page = 1, limit = 50) => {
    const res = await api.get<{ jobs: Job[]; total: number; total_pages: number }>(`/api/jobs?page=${page}&limit=${limit}`);
    return res.data;
  },
  publish: async (id: string, isAnonymous = true) => {
    const res = await api.post(`/api/jobs/${id}/publish`, { is_anonymous: isAnonymous });
    return res.data;
  },
  unpublish: async (id: string) => {
    const res = await api.post(`/api/jobs/${id}/unpublish`);
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await api.post(`/api/jobs/${id}/cancel`);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/api/jobs/${id}`);
    return res.data;
  },
};

export const workersApi = {
  list: async () => {
    const res = await api.get<{ workers: WorkerStatus[]; online_count: number }>('/api/workers');
    return res.data;
  },
  delete: async (workerId: string) => {
    const res = await api.delete(`/api/workers/${workerId}`);
    return res.data;
  },
};

export const galleryApi = {
  list: async (page = 1, limit = 20, sortBy: 'time' | 'likes' | 'comments' = 'time') => {
    const res = await api.get<{
      items: GalleryItem[];
      total: number;
      page: number;
      total_pages: number;
    }>(`/api/gallery?page=${page}&limit=${limit}&sort_by=${sortBy}`);
    return res.data;
  },
  stats: async () => {
    const res = await api.get<{
      total_images: number;
      total_users: number;
      today_images: number;
    }>('/api/gallery/stats');
    return res.data;
  },
};

export const socialApi = {
  // 点赞
  toggleLike: async (jobId: string) => {
    const res = await api.post<{ liked: boolean; like_count: number }>(`/api/social/jobs/${jobId}/like`);
    return res.data;
  },
  getLikeStatus: async (jobId: string) => {
    const res = await api.get<{ liked: boolean; like_count: number }>(`/api/social/jobs/${jobId}/like-status`);
    return res.data;
  },
  // 评论
  getComments: async (jobId: string, page = 1, limit = 20) => {
    const res = await api.get<{ comments: CommentItem[]; total: number }>(`/api/social/jobs/${jobId}/comments?page=${page}&limit=${limit}`);
    return res.data;
  },
  createComment: async (jobId: string, content: string) => {
    const res = await api.post<CommentItem>(`/api/social/jobs/${jobId}/comments`, { content });
    return res.data;
  },
  deleteComment: async (commentId: number) => {
    const res = await api.delete(`/api/social/comments/${commentId}`);
    return res.data;
  },
};

