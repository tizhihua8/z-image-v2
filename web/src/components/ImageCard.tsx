'use client';

import { useState, useEffect } from 'react';
import { Download, Copy, Maximize2, Check, X, Share2, Globe, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { socialApi, CommentItem } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface ImageCardProps {
  imageUrl: string;
  prompt: string;
  width: number;
  height: number;
  createdAt: string;
  author?: {
    username: string;
    nickname?: string | null;
    avatar_url?: string | null;
  };
  showAuthor?: boolean;
  // 分享到广场功能
  jobId?: string | number;
  isPublic?: boolean;
  onPublish?: (anonymous: boolean) => void;
  onUnpublish?: () => void;  // 取消发布
  onDelete?: () => void;  // 删除功能
  // 社交功能（广场专用）
  showSocial?: boolean;
  initialLikeCount?: number;
  initialCommentCount?: number;
}

export default function ImageCard({
  imageUrl,
  prompt,
  width,
  height,
  createdAt,
  author,
  showAuthor = false,
  jobId,
  isPublic,
  onPublish,
  onUnpublish,
  onDelete,
  showSocial = false,
  initialLikeCount = 0,
  initialCommentCount = 0,
}: ImageCardProps) {
  const { user } = useAuthStore();
  const [promptCopied, setPromptCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishAnonymous, setPublishAnonymous] = useState(true);
  
  // 社交功能状态
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${apiBase}${imageUrl}`;
  
  // 获取点赞状态
  useEffect(() => {
    if (showSocial && jobId) {
      socialApi.getLikeStatus(String(jobId)).then(res => {
        setLiked(res.liked);
        setLikeCount(res.like_count);
      }).catch(() => {});
    }
  }, [showSocial, jobId]);
  
  // 点赞/取消点赞
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!jobId) return;
    try {
      const res = await socialApi.toggleLike(String(jobId));
      setLiked(res.liked);
      setLikeCount(res.like_count);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };
  
  // 打开评论弹窗
  const handleOpenComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
    if (jobId && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await socialApi.getComments(String(jobId));
        setComments(res.comments);
        setCommentCount(res.total);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };
  
  // 发表评论
  const handleSubmitComment = async () => {
    if (!jobId || !newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await socialApi.createComment(String(jobId), newComment.trim());
      setComments(prev => [comment, ...prev]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    try {
      await socialApi.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // 复制提示词
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // 复制图片
  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // 下载图片
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zimage-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  // 预览
  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(true);
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

  return (
    <>
      <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden group hover:border-white/20 transition-colors">
        {/* 图片区域 */}
        <div className="aspect-square relative bg-black">
          <img
            src={fullImageUrl}
            alt={prompt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* 右上角点赞按钮 - 广场模式 */}
          {showSocial && (
            <button
              onClick={handleLike}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
              title={liked ? '取消点赞' : '点赞'}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              {likeCount > 0 && <span className="text-xs text-white">{likeCount}</span>}
            </button>
          )}
          
          {/* 左下角评论按钮 - 广场模式 */}
          {showSocial && (
            <button
              onClick={handleOpenComments}
              className="absolute bottom-2 left-2 flex items-center gap-1.5 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
              title="查看评论"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              {commentCount > 0 && <span className="text-xs text-white">{commentCount}</span>}
            </button>
          )}
          
          {/* 右下角操作按钮 - 始终显示，顺序：预览 → 发布/取消发布 → 下载 → 复制 → 删除 */}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={handlePreview}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
              title="预览"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            {/* 发布/取消发布按钮 */}
            {onPublish && !isPublic && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPublishModal(true); }}
                className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition-colors"
                title="分享到广场"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>
            )}
            {isPublic && onUnpublish && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('确定要从广场移除这个作品吗？')) {
                    onUnpublish();
                  }
                }}
                className="p-1.5 bg-green-500/40 hover:bg-red-500/40 rounded-lg backdrop-blur-sm transition-colors"
                title="从广场移除"
              >
                <Globe className="w-4 h-4 text-green-400" />
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
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('确定要删除这个作品吗？')) {
                    onDelete();
                  }
                }}
                className="p-1.5 bg-black/60 hover:bg-red-500/60 rounded-lg backdrop-blur-sm transition-colors"
                title="删除作品"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          {/* 提示词 + 复制按钮 */}
          <div className="flex items-start gap-2 mb-2">
            <p className="flex-1 text-sm text-white/80 line-clamp-2" title={prompt}>
              {prompt}
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

          {/* 作者信息 */}
          {showAuthor && author && (
            <div className="flex items-center gap-2 mb-2">
              {author.avatar_url ? (
                <img src={author.avatar_url} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600" />
              )}
              <span className="text-xs text-white/50">@{author.username}</span>
            </div>
          )}

          {/* 分辨率和时间 */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{width}×{height}</span>
            <span>{formatTime(createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 内置预览弹窗 */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowPreview(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onClick={() => setShowPreview(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullImageUrl}
              alt={prompt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {/* 底部信息栏 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <p className="text-white/90 text-sm mb-2 line-clamp-2">{prompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">{width}×{height}</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                  <button
                    onClick={handleCopyImage}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
                  >
                    {imageCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    复制
                  </button>
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
                  >
                    {promptCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    提示词
                  </button>
                  {onPublish && !isPublic && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPublishModal(true); }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" />
                      分享到广场
                    </button>
                  )}
                  {isPublic && onUnpublish && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要从广场移除这个作品吗？')) {
                          onUnpublish();
                        }
                      }}
                      className="px-3 py-1.5 bg-green-600/20 hover:bg-red-500/20 rounded-lg text-xs text-green-400 flex items-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      已发布
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这个作品吗？')) {
                          onDelete();
                          setShowPreview(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-red-500/20 rounded-lg text-xs text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 发布确认弹窗 */}
      {showPublishModal && onPublish && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPublishModal(false)}
        >
          <div 
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">发布到作品广场</h3>
            <p className="text-white/60 text-sm mb-4">确定将这张图片分享到公共广场吗？</p>
            
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={publishAnonymous}
                onChange={(e) => setPublishAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-white/80">匿名发布</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onPublish(publishAnonymous);
                  setShowPublishModal(false);
                  setShowPreview(false);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 评论弹窗 */}
      {showComments && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowComments(false)}
        >
          <div 
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">评论 ({commentCount})</h3>
              <button 
                onClick={() => setShowComments(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            {/* 评论列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="text-center text-white/40 py-8">加载中...</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-white/40 py-8">暂无评论，快来发表第一条评论吧！</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.user.avatar_url ? (
                      <img src={comment.user.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-white/80 font-medium">
                          {comment.user.nickname || comment.user.username}
                        </span>
                        <span className="text-xs text-white/40">
                          {formatTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 break-words">{comment.content}</p>
                    </div>
                    {/* 删除按钮：自己的评论或管理员可见 */}
                    {(user?.username === comment.user.username || user?.is_admin) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                        title="删除评论"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* 发表评论 */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  placeholder="发表评论..."
                  maxLength={500}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg text-white transition-colors flex items-center gap-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 导出独立的预览弹窗组件（用于外部控制）
export function ImagePreviewModal({
  imageUrl,
  prompt,
  onClose,
  isPublic,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  imageUrl: string;
  prompt: string;
  onClose: () => void;
  isPublic?: boolean;
  onPublish?: (anonymous: boolean) => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${apiBase}${imageUrl}`;
  const [promptCopied, setPromptCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishAnonymous, setPublishAnonymous] = useState(true);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleCopyImage = async () => {
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

  const handleDownload = async () => {
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zimage-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={fullImageUrl}
          alt={prompt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        {/* 底部信息栏 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
          <p className="text-white/90 text-sm mb-2 line-clamp-2">{prompt}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
            <button
              onClick={handleCopyImage}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              复制
            </button>
            <button
              onClick={handleCopyPrompt}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
            >
              {promptCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              提示词
            </button>
            {onPublish && !isPublic && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1"
              >
                <Share2 className="w-4 h-4" />
                分享到广场
              </button>
            )}
            {isPublic && onUnpublish && (
              <button
                onClick={() => {
                  if (confirm('确定要从广场移除这个作品吗？')) {
                    onUnpublish();
                  }
                }}
                className="px-3 py-1.5 bg-green-600/20 hover:bg-red-500/20 rounded-lg text-xs text-green-400 flex items-center gap-1"
              >
                <Globe className="w-4 h-4" />
                已发布
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('确定要删除这个作品吗？')) {
                    onDelete();
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-red-500/20 rounded-lg text-xs text-white flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 发布确认弹窗 */}
      {showPublishModal && onPublish && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => { e.stopPropagation(); setShowPublishModal(false); }}
        >
          <div 
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">发布到作品广场</h3>
            <p className="text-white/60 text-sm mb-4">确定将这张图片分享到公共广场吗？</p>
            
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={publishAnonymous}
                onChange={(e) => setPublishAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-white/80">匿名发布</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onPublish(publishAnonymous);
                  setShowPublishModal(false);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
