'use client';

import { useState } from 'react';
import { Sparkles, Settings2, Loader2, AlertCircle } from 'lucide-react';
import { jobsApi, type Job } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Props {
  onJobCreated: (job: Job) => void;
}

export default function GenerateForm({ onJobCreated }: Props) {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);  // 默认 16:9
  const [steps, setSteps] = useState(9);      // 默认采样步数
  const [seed, setSeed] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (!user) {
      setError('请先登录');
      return;
    }
    if (user.remaining_quota <= 0) {
      setError('今日配额已用完');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const job = await jobsApi.create({
        prompt: prompt.trim(),
        width,
        height,
        steps,
        seed: seed >= 0 ? seed : undefined,
      });
      onJobCreated(job);
      setPrompt('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: '1:1', w: 1024, h: 1024 },
    { label: '16:9', w: 1024, h: 576 },
    { label: '9:16', w: 576, h: 1024 },
    { label: '4:3', w: 1024, h: 768 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Prompt Input */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的图像..."
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
          disabled={loading}
        />
        <div className="absolute bottom-3 right-3 text-xs text-white/30">
          {prompt.length}/2000
        </div>
      </div>

      {/* Quick Examples */}
      <div className="flex flex-wrap gap-2">
        {[
          '一只可爱的橘猫在阳光下打盹',
          '赛博朋克风格的未来城市夜景',
          '中国水墨画风格的山水',
          '宇航员在月球上骑自行车',
        ].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
      >
        <Settings2 className="w-4 h-4" />
        高级设置
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
          {/* Resolution Presets */}
          <div>
            <label className="block text-sm text-white/60 mb-2">分辨率</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setWidth(p.w); setHeight(p.h); }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    width === p.w && height === p.h
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {p.label} ({p.w}×{p.h})
                </button>
              ))}
            </div>
          </div>

          {/* Custom Resolution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">宽度</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.min(1024, Math.max(256, parseInt(e.target.value) || 256)))}
                min={256}
                max={1024}
                step={64}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">高度</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.min(1024, Math.max(256, parseInt(e.target.value) || 256)))}
                min={256}
                max={1024}
                step={64}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm text-white/60 mb-1">采样步数: {steps}</label>
            <input
              type="range"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value))}
              min={4}
              max={20}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-white/30">
              <span>快速 (4)</span>
              <span>高质量 (20)</span>
            </div>
          </div>

          {/* Seed */}
          <div>
            <label className="block text-sm text-white/60 mb-1">随机种子</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
              placeholder="-1 表示随机"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !prompt.trim() || !user}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium shadow-lg shadow-indigo-500/25 transition-all"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            生成图像
          </>
        )}
      </button>

      {/* Quota Info */}
      {user && (
        <p className="text-center text-sm text-white/40">
          今日剩余 {user.remaining_quota}/{user.daily_quota} 张
        </p>
      )}
    </form>
  );
}

