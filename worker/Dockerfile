# ============================================
# Z-Image Worker Dockerfile
# Python + CUDA + Diffusers
# ============================================
# 此 Worker 需要 GPU 支持
# 确保已安装 NVIDIA Container Toolkit
# 安装方法: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3-venv \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /worker

# Upgrade pip
RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements
COPY requirements.txt .

# Install PyTorch with CUDA support
RUN pip3 install --no-cache-dir \
    torch==2.1.0 \
    torchvision==0.16.0 \
    --index-url https://download.pytorch.org/whl/cu121

# Install other dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Install diffusers from source (latest with Z-Image support)
RUN pip3 install --no-cache-dir git+https://github.com/huggingface/diffusers

# Copy application code
COPY . .

# Create backup directory
RUN mkdir -p /worker/backup /worker/models

# Create non-root user (optional, may cause permission issues with GPU)
# RUN useradd -m -u 1001 worker && \
#     chown -R worker:worker /worker
# USER worker

# Expose health check port (if any)
# EXPOSE 8001

# Health check - verify GPU is accessible
HEALTHCHECK --interval=60s --timeout=30s --start-period=300s --retries=3 \
    CMD python3 -c "import torch; assert torch.cuda.is_available(), 'CUDA not available'"

# Start worker
CMD ["python3", "worker.py"]
