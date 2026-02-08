'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';
import { useAuthStore } from '@/lib/store';
import { galleryApi, type GalleryItem } from '@/lib/api';
import { ImageIcon, Loader2, ChevronLeft, ChevronRight, Lock, Search, Clock, Heart, MessageCircle } from 'lucide-react';

type SortBy = 'time' | 'likes' | 'comments';

export default function GalleryPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('likes');

  // 检查登录状态
  useEffect(() => {
    if (isHydrated && !user) {
      // 未登录，不加载数据
      setLoading(false);
    }
  }, [user, isHydrated]);

  // 加载数据
  useEffect(() => {
    if (!user) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const data = await galleryApi.list(page, 18, sortBy);
        setItems(data.items);
        setTotalPages(data.total_pages);
      } catch (e) {
        console.error('Failed to load gallery', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, user, sortBy]);
  
  // 切换排序时回到第一页
  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
    setPage(1);
  };

  // 未登录提示
  if (isHydrated && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-20">
            <Lock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">需要登录</h2>
            <p className="text-white/40 mb-6">登录后即可浏览作品广场</p>
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
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">作品广场</h1>
          <p className="text-sm text-white/40 mt-2">
            在「我的作品」页面，将鼠标悬停在图片上，点击分享按钮即可发布到广场
          </p>
        </div>

        {/* 排序按钮 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleSortChange('time')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'time' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            最新
          </button>
          <button
            onClick={() => handleSortChange('likes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'likes' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Heart className="w-4 h-4" />
            最多点赞
          </button>
          <button
            onClick={() => handleSortChange('comments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'comments' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            最多评论
          </button>
        </div>

        {/* 搜索和分页 */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
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
        ) : items.length > 0 ? (
          <>
            {/* Grid - 自适应 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {items
                .filter(item => {
                  if (!searchQuery.trim()) return true;
                  // 只匹配 prompt，不匹配用户名
                  return item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map((item) => (
                <ImageCard
                  key={item.id}
                  jobId={item.id}
                  imageUrl={item.image_url}
                  prompt={item.prompt}
                  width={item.width}
                  height={item.height}
                  createdAt={item.created_at}
                  author={item.author || undefined}
                  showAuthor={true}
                  showSocial={true}
                  initialLikeCount={item.like_count}
                  initialCommentCount={item.comment_count}
                />
              ))}
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
          </div>
        )}
      </main>
    </div>
  );
}
