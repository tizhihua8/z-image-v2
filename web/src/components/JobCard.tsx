'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, X, Clock, Download, Copy, Maximize2, Share2, Globe, Trash2 } from 'lucide-react';
import { ImagePreviewModal } from './ImageCard';
import { jobsApi, type Job } from '@/lib/api';

interface Props {
  job: Job;
  onUpdate?: (job: Job) => void;
}

const statusConfig = {
  queued: { icon: Clock, label: '排队中', color: 'text-yellow-400', bg: 'bg-yellow-400/10', animate: false },
  running: { icon: Loader2, label: '生成中', color: 'text-blue-400', bg: 'bg-blue-400/10', animate: true },
  done: { icon: Check, label: '完成', color: 'text-emerald-400', bg: 'bg-emerald-400/10', animate: false },
  failed: { icon: X, label: '失败', color: 'text-red-400', bg: 'bg-red-400/10', animate: false },
  cancelled: { icon: X, label: '已取消', color: 'text-gray-400', bg: 'bg-gray-400/10', animate: false },
};

export default function JobCard({ job: initialJob, onUpdate }: Props) {
  const [job, setJob] = useState(initialJob);
  const [promptCopied, setPromptCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const config = statusConfig[job.status];
  const Icon = config.icon;

  // 取消任务
  const handleCancel = async () => {
    if (!confirm('确定要取消这个任务吗？')) return;
    setCancelling(true);
    try {
      await jobsApi.cancel(job.id);
      const updated = { ...job, status: 'cancelled' as const };
      setJob(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.error('Failed to cancel:', err);
      alert('取消失败，请重试');
    } finally {
      setCancelling(false);
    }
  };
  
  // 删除作品
  const handleDelete = async () => {
    if (!confirm('确定要删除这个作品吗？删除后将从列表中移除。')) return;
    setDeleting(true);
    try {
      await jobsApi.delete(job.id);
      // 通知父组件移除此卡片
      onUpdate?.({ ...job, status: 'cancelled' as const }); // 触发刷新
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  const fullImageUrl = job.image_url ? `${apiBase}${job.image_url}` : '';

  // 轮询更新状态
  useEffect(() => {
    if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await jobsApi.get(job.id);
        setJob(updated);
        onUpdate?.(updated);
      } catch (e) {
        console.error('Failed to update job', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job.id, job.status, onUpdate]);

  // 下载图片
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullImageUrl) return;
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zimage-${job.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  // 复制图片
  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullImageUrl) return;
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  // 复制提示词
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(job.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // 预览
  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  // 发布到广场
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await jobsApi.publish(job.id, isAnonymous);
      setJob({ ...job, is_public: true, is_anonymous: isAnonymous });
      onUpdate?.({ ...job, is_public: true, is_anonymous: isAnonymous });
      setShowPublishModal(false);
    } catch (err) {
      console.error('Failed to publish:', err);
      alert('发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  };

  // 取消发布
  const handleUnpublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要从广场移除这个作品吗？')) return;
    try {
      await jobsApi.unpublish(job.id);
      setJob({ ...job, is_public: false });
      onUpdate?.({ ...job, is_public: false });
    } catch (err) {
      console.error('Failed to unpublish:', err);
    }
  };

  // 格式化时间（后端返回 UTC 时间）
  const formatTime = (dateStr: string) => {
    // 确保解析为 UTC 时间
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString();
  };
  
  // 获取等待时间
  const getWaitingTime = (dateStr: string) => {
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`;
    return `${Math.floor(diff / 3600)}时${Math.floor((diff % 3600) / 60)}分`;
  };
  
  // 获取已用时间
  const getElapsedTime = (dateStr: string) => {
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`;
    return `${Math.floor(diff / 3600)}时${Math.floor((diff % 3600) / 60)}分`;
  };

  return (
    <>
      <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors group">
        {/* 图片区域 */}
        <div className="aspect-square bg-black relative">
          {job.status === 'done' && job.image_url ? (
            <>
              <img
                src={fullImageUrl}
                alt={job.prompt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* 已发布标识 */}
              {job.is_public && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 rounded-lg text-xs text-white flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  已发布
                </div>
              )}
              {/* 右下角操作按钮 - 始终显示 */}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  onClick={handlePreview}
                  className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
                  title="预览"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
                {/* 发布按钮 */}
                {job.is_public ? (
                  <button
                    onClick={handleUnpublish}
                    className="p-1.5 bg-green-500/40 hover:bg-red-500/40 rounded-lg backdrop-blur-sm transition-colors"
                    title="从广场移除"
                  >
                    <Globe className="w-4 h-4 text-green-400" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPublishModal(true); }}
                    className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
                    title="发布到广场"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
                  title="下载"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleCopyImage}
                  className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
                  title="复制图片"
                >
                  {imageCopied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white" />
                  )}
                </button>
                {/* 删除按钮 */}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1.5 bg-black/60 hover:bg-red-500/60 rounded-lg backdrop-blur-sm transition-colors"
                  title="删除作品"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative">
              {/* 取消按钮 - 排队中或生成中显示 */}
              {(job.status === 'queued' || job.status === 'running') && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                  title="取消任务"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              )}
              <div className={`p-4 rounded-full ${config.bg}`}>
                <Icon className={`w-8 h-8 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
              </div>
              <span className={`text-sm ${config.color}`}>{config.label}</span>
              {/* 排队中状态详情 */}
              {job.status === 'queued' && (
                <div className="flex flex-col items-center gap-1">
                  {job.queue_position && (
                    <span className="text-xs text-white/40">队列位置: #{job.queue_position}</span>
                  )}
                  <span className="text-xs text-white/30">
                    等待中 {getWaitingTime(job.created_at)}
                  </span>
                </div>
              )}
              {/* 生成中状态详情 */}
              {job.status === 'running' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-white/40">正在生成图像...</span>
                  {job.started_at && (
                    <span className="text-xs text-white/30">
                      已用时 {getElapsedTime(job.started_at)}
                    </span>
                  )}
                </div>
              )}
              {job.status === 'failed' && job.error_message && (
                <span className="text-xs text-red-400/60 px-4 text-center line-clamp-2">{job.error_message}</span>
              )}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          {/* 提示词 + 复制按钮 */}
          <div className="flex items-start gap-2 mb-2">
            <p className="flex-1 text-sm text-white/80 line-clamp-2" title={job.prompt}>
              {job.prompt}
            </p>
            <button
              onClick={handleCopyPrompt}
              className="flex-shrink-0 p-1 text-white/40 hover:text-white/80 transition-colors"
              title="复制提示词"
            >
              {promptCopied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 分辨率和时间 */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{job.width}×{job.height}</span>
            <span>{formatTime(job.created_at)}</span>
          </div>
        </div>
      </div>

      {/* 预览弹窗 */}
      {showPreview && job.image_url && (
        <ImagePreviewModal
          imageUrl={job.image_url}
          prompt={job.prompt}
          onClose={() => setShowPreview(false)}
          isPublic={job.is_public}
          onPublish={async (anonymous) => {
            setPublishing(true);
            try {
              await jobsApi.publish(job.id, anonymous);
              setJob({ ...job, is_public: true, is_anonymous: anonymous });
              onUpdate?.({ ...job, is_public: true, is_anonymous: anonymous });
            } catch (err) {
              console.error('Failed to publish:', err);
              alert('发布失败，请重试');
            } finally {
              setPublishing(false);
            }
          }}
          onUnpublish={async () => {
            try {
              await jobsApi.unpublish(job.id);
              setJob({ ...job, is_public: false });
              onUpdate?.({ ...job, is_public: false });
            } catch (err) {
              console.error('Failed to unpublish:', err);
              alert('取消发布失败，请重试');
            }
          }}
          onDelete={async () => {
            try {
              await jobsApi.delete(job.id);
              onUpdate?.({ ...job, status: 'cancelled' as const });
            } catch (err) {
              console.error('Failed to delete:', err);
              alert('删除失败，请重试');
            }
          }}
        />
      )}

      {/* 发布确认弹窗 */}
      {showPublishModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPublishModal(false)}
        >
          <div 
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">发布到作品广场</h3>
            <p className="text-sm text-white/50 mb-4">
              发布后，其他用户可以在作品广场看到这个作品
            </p>

            {/* 匿名选项 */}
            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="text-sm">匿名发布</div>
                <div className="text-xs text-white/40">其他用户看不到你的用户名</div>
              </div>
            </label>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    确认发布
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
