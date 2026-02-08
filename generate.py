# -*- coding: utf-8 -*-
"""
Z-Image 图像生成脚本
基于 Z-Image-Turbo 模型的快速图像生成

使用方法:
    python generate.py --prompt "你的提示词" --output output.png
    python generate.py --prompt "提示词" --width 1024 --height 1024 --seed 42
"""

import argparse
import sys
import os

# 设置 Windows 终端 UTF-8 编码
if sys.platform == "win32":
    os.system("chcp 65001 >nul 2>&1")
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import torch
from diffusers import ZImagePipeline
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Z-Image 图像生成")
    parser.add_argument(
        "--prompt", "-p",
        type=str,
        required=True,
        help="图像生成提示词（支持中英文）"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="output.png",
        help="输出图像路径 (默认: output.png)"
    )
    parser.add_argument(
        "--width", "-W",
        type=int,
        default=1024,
        help="图像宽度 (默认: 1024)"
    )
    parser.add_argument(
        "--height", "-H",
        type=int,
        default=1024,
        help="图像高度 (默认: 1024)"
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=9,
        help="推理步数 (默认: 9，实际 DiT 前向传播 8 次)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="随机种子（不指定则随机生成）"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="Tongyi-MAI/Z-Image-Turbo",
        help="模型路径或 HuggingFace 模型 ID"
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cuda",
        choices=["cuda", "cpu"],
        help="运行设备 (默认: cuda)"
    )
    parser.add_argument(
        "--cpu-offload",
        action="store_true",
        help="启用 CPU 卸载以节省显存（适合显存不足时使用）"
    )
    parser.add_argument(
        "--compile",
        action="store_true",
        help="编译模型以加速推理（首次运行会较慢）"
    )
    parser.add_argument(
        "--flash-attention",
        action="store_true",
        help="使用 Flash Attention（需要支持的 GPU）"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    
    print(f"🚀 正在加载 Z-Image 模型: {args.model}")
    print(f"   设备: {args.device}")
    
    # 加载模型
    pipe = ZImagePipeline.from_pretrained(
        args.model,
        torch_dtype=torch.bfloat16 if args.device == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
    )
    
    # 设备配置
    if args.cpu_offload:
        print("   启用 CPU 卸载模式")
        pipe.enable_model_cpu_offload()
    else:
        pipe.to(args.device)
    
    # 可选：Flash Attention
    if args.flash_attention:
        try:
            pipe.transformer.set_attention_backend("flash")
            print("   已启用 Flash Attention")
        except Exception as e:
            print(f"   ⚠️ 无法启用 Flash Attention: {e}")
    
    # 可选：模型编译
    if args.compile:
        print("   正在编译模型（首次运行会较慢）...")
        pipe.transformer.compile()
    
    # 设置随机种子
    generator = None
    if args.seed is not None:
        generator = torch.Generator(args.device).manual_seed(args.seed)
        print(f"   随机种子: {args.seed}")
    
    print(f"\n📝 提示词: {args.prompt}")
    print(f"📐 尺寸: {args.width} x {args.height}")
    print(f"🔄 推理步数: {args.steps}")
    print("\n⏳ 正在生成图像...")
    
    # 生成图像
    image = pipe(
        prompt=args.prompt,
        height=args.height,
        width=args.width,
        num_inference_steps=args.steps,
        guidance_scale=0.0,  # Turbo 模型无需引导
        generator=generator,
    ).images[0]
    
    # 保存图像
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)
    
    print(f"\n✅ 图像已保存到: {output_path.absolute()}")


if __name__ == "__main__":
    main()

