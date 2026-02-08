# -*- coding: utf-8 -*-
"""
Z-Image-Edit 图像编辑脚本
基于 Z-Image-Edit 模型的指令式图像编辑

注意: Z-Image-Edit 模型尚未发布，此脚本预留供后续使用

使用方法:
    python edit.py --input input.png --prompt "将背景改为海滩" --output edited.png
"""

import argparse
import torch
from PIL import Image
from pathlib import Path

# 注意：Z-Image-Edit 的 Pipeline 类名可能不同，待官方发布后更新
# from diffusers import ZImageEditPipeline


def parse_args():
    parser = argparse.ArgumentParser(description="Z-Image 图像编辑")
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="输入图像路径"
    )
    parser.add_argument(
        "--prompt", "-p",
        type=str,
        required=True,
        help="编辑指令（支持中英文）"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="edited.png",
        help="输出图像路径 (默认: edited.png)"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="Tongyi-MAI/Z-Image-Edit",
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
        "--seed",
        type=int,
        default=None,
        help="随机种子"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    
    print("⚠️  Z-Image-Edit 模型尚未发布！")
    print("   请等待官方发布后再使用此脚本。")
    print("   当前可用模型: Z-Image-Turbo")
    print("\n   相关链接:")
    print("   - GitHub: https://github.com/Tongyi-MAI/Z-Image")
    print("   - HuggingFace: https://huggingface.co/Tongyi-MAI")
    
    # 以下代码待模型发布后启用
    """
    # 加载输入图像
    input_image = Image.open(args.input).convert("RGB")
    
    # 加载模型
    pipe = ZImageEditPipeline.from_pretrained(
        args.model,
        torch_dtype=torch.bfloat16,
    )
    pipe.to(args.device)
    
    # 设置随机种子
    generator = None
    if args.seed is not None:
        generator = torch.Generator(args.device).manual_seed(args.seed)
    
    # 编辑图像
    edited_image = pipe(
        image=input_image,
        prompt=args.prompt,
        generator=generator,
    ).images[0]
    
    # 保存结果
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    edited_image.save(output_path)
    
    print(f"✅ 编辑后图像已保存到: {output_path.absolute()}")
    """


if __name__ == "__main__":
    main()



