# -*- coding: utf-8 -*-
"""
下载 Z-Image 模型

使用方法:
    python download_model.py
"""
import os
import sys

if sys.platform == "win32":
    os.system("chcp 65001 >nul 2>&1")
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 禁用符号链接警告
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

print("=" * 50)
print("  Z-Image 模型下载器")
print("=" * 50)
print()
print("模型: Tongyi-MAI/Z-Image-Turbo")
print("大小: 约 25GB")
print("来源: HuggingFace")
print()
print("下载中，请耐心等待...")
print("(如果下载慢，可设置镜像: set HF_ENDPOINT=https://hf-mirror.com)")
print()

import torch
from diffusers import ZImagePipeline

try:
    pipe = ZImagePipeline.from_pretrained(
        "Tongyi-MAI/Z-Image-Turbo",
        torch_dtype=torch.bfloat16,
        low_cpu_mem_usage=True,
    )
    
    print()
    print("=" * 50)
    print("  ✅ 下载完成！")
    print("=" * 50)
    print()
    print("现在可以运行:")
    print("  python generate.py --prompt \"你的提示词\"")
    print()
    
except Exception as e:
    print(f"\n❌ 下载失败: {e}")
    print()
    print("常见问题:")
    print("1. 确保已开启 Windows 开发者模式")
    print("2. 检查网络连接")
    print("3. 尝试设置镜像: set HF_ENDPOINT=https://hf-mirror.com")
    import traceback
    traceback.print_exc()
