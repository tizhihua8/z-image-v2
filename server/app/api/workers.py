# -*- coding: utf-8 -*-
"""Worker API"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional

from app.models import get_db, Worker, WorkerStatus, Job, JobStatus
from app.api.deps import verify_worker_auth, get_current_admin

router = APIRouter()


class HeartbeatRequest(BaseModel):
    """心跳请求"""
    worker_id: str
    status: str  # idle / busy / offline
    current_job_id: Optional[str] = None
    gpu_info: Optional[dict] = None


class HeartbeatResponse(BaseModel):
    """心跳响应"""
    success: bool
    message: str = "OK"


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    data: HeartbeatRequest,
    worker: Worker = Depends(verify_worker_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Worker 心跳
    
    Worker 定期发送心跳，更新状态和 GPU 信息
    """
    # 更新 Worker 状态
    worker.status = data.status
    worker.last_seen_at = datetime.utcnow()
    worker.current_job_id = data.current_job_id
    
    if data.gpu_info:
        worker.gpu_info = data.gpu_info
    
    return HeartbeatResponse(success=True)


@router.get("/{worker_id}/next-job")
async def get_next_job(
    worker_id: str,
    worker: Worker = Depends(verify_worker_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    拉取下一个待处理任务（原子性领取）
    
    使用 SELECT FOR UPDATE 锁定任务，确保同一任务不会被多个 Worker 领取
    """
    # 检查 Worker 是否匹配
    if worker.id != worker_id:
        raise HTTPException(status_code=403, detail="Worker ID 不匹配")
    
    # 原子性查找并锁定最高优先级的 queued 任务
    from sqlalchemy import update
    from datetime import datetime
    
    # 使用 UPDATE ... WHERE 实现原子性领取
    # 只有成功将状态从 queued 改为 running 的 Worker 才能获得任务
    # 优先级高的先处理（管理员任务插队），同优先级按创建时间
    result = await db.execute(
        select(Job)
        .where(Job.status == JobStatus.QUEUED.value)
        .order_by(Job.priority.desc(), Job.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)  # 跳过已被锁定的行
    )
    job = result.scalar_one_or_none()
    
    if not job:
        # 无任务，返回 204 No Content
        from fastapi.responses import Response
        return Response(status_code=204)
    
    # 原子性更新状态为 running，由当前 Worker 领取
    job.status = JobStatus.RUNNING.value
    job.started_at = datetime.utcnow()
    job.worker_id = worker.id
    await db.commit()
    
    return {
        "id": job.id,
        "user_id": job.user_id,
        "prompt": job.prompt,
        "negative_prompt": job.negative_prompt,
        "width": job.width,
        "height": job.height,
        "steps": job.steps,
        "cfg_scale": job.cfg_scale,
        "seed": job.seed,
        "sampler": job.sampler,
        "created_at": job.created_at.isoformat(),
    }


@router.get("")
async def list_workers(
    db: AsyncSession = Depends(get_db),
):
    """获取所有 Worker 状态（公开接口，用于显示服务状态）"""
    result = await db.execute(select(Worker))
    workers = result.scalars().all()
    
    return {
        "workers": [
            {
                "id": w.id,
                "name": w.name,
                "status": "online" if w.is_online else "offline",
                "is_busy": w.status == WorkerStatus.BUSY.value,
                "current_job_id": w.current_job_id if w.is_online else None,
                "gpu_info": w.gpu_info,
                "last_seen_at": w.last_seen_at,
            }
            for w in workers
        ],
        "online_count": sum(1 for w in workers if w.is_online),
        "total_count": len(workers),
    }


@router.delete("/{worker_id}")
async def delete_worker(
    worker_id: str,
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """删除 Worker 记录（仅管理员，且只能删除离线的 Worker）"""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    
    if not worker:
        raise HTTPException(status_code=404, detail="Worker 不存在")
    
    if worker.is_online:
        raise HTTPException(status_code=400, detail="无法删除在线的 Worker")
    
    await db.delete(worker)
    await db.commit()
    
    return {"success": True, "message": f"已删除 Worker: {worker_id}"}



