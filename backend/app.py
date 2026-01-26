from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
import cv2
import numpy as np
import os
import shutil
from datetime import datetime
from typing import List

from .database import get_db, init_db
from .models import MealRecord, WasteDetail
from .services.vision_service import get_vision_service

app = FastAPI(title="Smart Canteen API", description="智慧食堂剩菜识别与分析系统")

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态资源目录（用于保存上传和处理后的图片）
UPLOAD_DIR = "static/uploads"
RESULT_DIR = "static/results"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def startup_event():
    init_db()
    # 预加载模型
    get_vision_service()

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Canteen API", "docs": "/docs"}

@app.get("/api/video_feed")
async def video_feed():
    """实时视频流口"""
    vision_service = get_vision_service()
    return StreamingResponse(
        vision_service.get_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/detection_stats")
async def detection_stats():
    """获取当前实物体统计"""
    vision_service = get_vision_service()
    return {"count": vision_service.current_count}

@app.post("/api/capture")
async def capture_and_analyze(db: Session = Depends(get_db)):
    """从实时流抓取当前帧并分析"""
    vision_service = get_vision_service()
    frame = vision_service.capture_frame()
    if frame is None:
        raise HTTPException(status_code=500, detail="Failed to capture frame from camera")
    
    # 保存抓取的图片
    filename = f"capture_{int(datetime.now().timestamp())}.jpg"
    file_path = os.path.join(UPLOAD_DIR, filename)
    cv2.imwrite(file_path, frame)
    
    return await _process_image_analysis(frame, filename, db)

@app.post("/api/upload")
async def upload_plate(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """上传餐盘图片并进行 AI 分析"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    filename = f"{int(datetime.now().timestamp())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image = cv2.imread(file_path)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    return await _process_image_analysis(image, filename, db)

async def _process_image_analysis(image: np.ndarray, filename: str, db: Session):
    """通用图像分析与保存逻辑"""
    vision_service = get_vision_service()
    analysis_result, error = await vision_service.analyze_tray(image, save_dir=RESULT_DIR)
    
    if error:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {error}")

    record = MealRecord(
        image_path=filename,
        total_waste_rate=analysis_result["total_waste_rate"]
    )
    db.add(record)
    db.flush()

    for item in analysis_result["items"]:
        detail = WasteDetail(
            meal_record_id=record.id,
            food_name=item["category"],
            waste_rate=item["waste_rate"],
            region_name=item["original_grid"]
        )
        db.add(detail)
    
    db.commit()

    return {
        "id": record.id,
        "total_waste_rate": record.total_waste_rate,
        "analysis": analysis_result["items"],
        "result_image_url": f"/static/results/{analysis_result['result_image']}"
    }

@app.get("/api/stats/taste")
async def get_taste_stats(db: Session = Depends(get_db)):
    """
    口味偏好分析：统计各菜品的平均剩余率
    """
    stats = db.query(
        WasteDetail.food_name,
        func.avg(WasteDetail.waste_rate).label("avg_waste"),
        func.count(WasteDetail.id).label("count")
    ).group_by(WasteDetail.food_name).all()

    # 格式化结果
    results = []
    for s in stats:
        # 如果 food_name 是 "None" 或包含 "区域"，通常代表未匹配到具体菜品
        results.append({
            "food_name": s.food_name,
            "average_waste_rate": round(float(s.avg_waste), 2),
            "sample_count": s.count,
            "popularity_score": round(100 - float(s.avg_waste), 2) # 100 - 剩余率 = 受欢迎度
        })

    # 按受欢迎度排序
    results.sort(key=lambda x: x["popularity_score"], reverse=True)
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
