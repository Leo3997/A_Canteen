"""
实时摄像头实例分割测试脚本
支持双模式：
1. YOLOv8-seg 实时预览 (高性能)
2. SAM 高精度快照分析 (按下 's' 键运行)
"""

import cv2
import torch
import numpy as np
from ultralytics import YOLO
import os
import sys
import json

import time

# 导入之前的 SAM 分析逻辑
sys.path.append(os.path.dirname(__file__))
try:
    from area_sam import load_sam_model, analyze_leftovers_sam
    HAS_SAM = True
except ImportError:
    HAS_SAM = False

# 触发参数配置
STABILITY_THRESHOLD_FRAMES = 30  # 约 1 秒 (假设 30FPS)
STABILITY_DISTANCE_LIMIT = 10    # 物体中心偏移不大于此值则视为未动
COOLDOWN_SECONDS = 8             # 识别后的冷却时间

def run_camera_segmentation():
    # 1. 加载 YOLO 实例分割模型 (会在线下载 ~10MB 的权重)
    # 1650 显卡建议使用 'n' 或 's' 版本以确保实时性
    print("正在加载 YOLO 实例分割模型...")
    model = YOLO('yolov8n-seg.pt')  # 使用 Nano 版本确保极致流畅
    
    # 2. 状态变量
    # 使用 CAP_DSHOW 后端通常在 Windows 上比默认的 MSMF 更稳定，并能减少驱动超时
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[Retry] 正在尝试备用后端...")
        cap = cv2.VideoCapture(0)
        
    if not cap.isOpened():
        print("错误：无法打开摄像头")
        return

    # 设置分辨率，减轻总线压力
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("\n--- 自动化摄像头分析启动 ---")
    print("模式：检测到稳定餐盘即自动触发高精度分析")
    print("控制键: 's' - 手动截图并分析, 'q' - 退出")

    stability_counter = 0
    last_center = None
    last_analysis_time = 0
    sam_model = load_sam_model() if HAS_SAM else None

    # 抑制 YOLO 的打印，保持终端整洁
    model.to('cuda') # 显式移动到 GPU

    retry_count = 0
    while True:
        try:
            ret, frame = cap.read()
            if not ret: 
                retry_count += 1
                if retry_count > 10: # 减少重试等待
                    print(f"\r[WARN] 摄像头读取异常，重试中 ({retry_count}/30)...", end="")
                    if retry_count > 30:
                        print("\n[WARN] 摄像头连接中断，正在重新初始化硬件...")
                        cap.release()
                        time.sleep(2)
                        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                        retry_count = 0
                continue
        except Exception as e:
            print(f"\n[ERROR] 硬件读取异常: {e}")
            time.sleep(1)
            continue
        
        retry_count = 0 

        current_time = time.time()
        is_cooling = (current_time - last_analysis_time) < COOLDOWN_SECONDS
        
        # 实时推理
        # 初始化界面图层，确保后续 logic 始终有底图可用
        annotated_frame = frame.copy()
        
        results = model(frame, verbose=False)
        annotated_frame = results[0].plot()
        
        # 查找目标 (筛选 bowl 类别)
        detected_target = None
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            # YOLO 模型中的 bowl(45) 或 cup(46-有时餐具误识别)
            if (cls_id == 45 or cls_id == 39) and conf > 0.5: # 45是bowl, 39是bottle(有时餐具像)
                detected_target = box.xywh[0].cpu().numpy() # [x, y, w, h]
                break

        # 稳定性判定逻辑
        status_text = "Status: Scanning..."
        status_color = (0, 255, 255) # 黄色

        if is_cooling:
            status_text = "Status: Cooldown..."
            status_color = (128, 128, 128)
            stability_counter = 0
        elif detected_target is not None:
            cx, cy = detected_target[0], detected_target[1]
            if last_center is not None:
                dist = np.sqrt((cx - last_center[0])**2 + (cy - last_center[1])**2)
                if dist < STABILITY_DISTANCE_LIMIT:
                    stability_counter += 1
                else:
                    stability_counter = 0
            last_center = (cx, cy)
            
            # 进度条提示
            progress = min(stability_counter / STABILITY_THRESHOLD_FRAMES, 1.0)
            status_text = f"Status: Locking {int(progress*100)}%"
            status_color = (255, 128, 0)
            
            # 触发分析
            if stability_counter >= STABILITY_THRESHOLD_FRAMES:
                status_text = "Status: ANALYZING..."
                status_color = (0, 255, 0)
                cv2.putText(annotated_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 3)
                cv2.imshow("Smart Canteen Recognition", annotated_frame)
                cv2.waitKey(1)
                
                # 自动触发分析
                print("\n[AUTO] 检测到稳定餐盘，正在触发自动分析...")
                snapshot_path = "auto_snapshot.png"
                cv2.imwrite(snapshot_path, frame)
                
                try:
                    analyze_leftovers_sam(snapshot_path, sam_model)
                    print("[AUTO] 自动分析完成！")
                except Exception as e:
                    print(f"[ERROR] 分析出错: {e}")
                
                last_analysis_time = time.time()
                stability_counter = 0
                
                # 分析完后，摄像头缓冲区可能堆积了陈旧帧，这里主动排空几帧
                print("[INFO] 正在恢复摄像头监控...")
                for _ in range(10): cap.read() 
        else:
            stability_counter = 0
            last_center = None

        # 绘制 UI 状态
        cv2.putText(annotated_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
        cv2.putText(annotated_frame, "Press 's' to Capture", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
        
        # === 新增：餐盘放置引导框 (居中) ===
        h, w = annotated_frame.shape[:2]
        # 定义一个占屏幕约 75% 的虚线/透明框
        box_w, box_h = int(w * 0.75), int(h * 0.75)
        x1, y1 = (w - box_w) // 2, (h - box_h) // 2
        x2, y2 = x1 + box_w, y1 + box_h
        
        # 绘制四个角的 L 型边框，更具科技感
        line_len = 40
        color_guide = (0, 255, 0) if detected_target is not None else (200, 200, 200)
        thick = 2
        # 左上
        cv2.line(annotated_frame, (x1, y1), (x1 + line_len, y1), color_guide, thick)
        cv2.line(annotated_frame, (x1, y1), (x1, y1 + line_len), color_guide, thick)
        # 右上
        cv2.line(annotated_frame, (x2, y1), (x2 - line_len, y1), color_guide, thick)
        cv2.line(annotated_frame, (x2, y1), (x2, y1 + line_len), color_guide, thick)
        # 左下
        cv2.line(annotated_frame, (x1, y2), (x1 + line_len, y2), color_guide, thick)
        cv2.line(annotated_frame, (x1, y2), (x1, y2 - line_len), color_guide, thick)
        # 右下
        cv2.line(annotated_frame, (x2, y2), (x2 - line_len, y2), color_guide, thick)
        cv2.line(annotated_frame, (x2, y2), (x2, y2 - line_len), color_guide, thick)
        
        if detected_target is None:
            cv2.putText(annotated_frame, "Please place the tray here", (x1 + 10, y1 + 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)

        # === 新增：基于 plate_template.json 的四个菜品区引导框 ===
        template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "plate_template.json")
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = json.load(f)
            
            t_w, t_h = template["image_size"]
            scale_x = w / t_w
            scale_y = h / t_h
            
            roi_color = (0, 255, 0) if detected_target is not None else (100, 100, 100)
            
            for i, (rx, ry, rw, rh) in enumerate(template["rois"]):
                # 缩放坐标
                nx1 = int(rx * scale_x)
                ny1 = int(ry * scale_y)
                nx2 = int((rx + rw) * scale_x)
                ny2 = int((ry + rh) * scale_y)
                
                # 绘制细线框
                cv2.rectangle(annotated_frame, (nx1, ny1), (nx2, ny2), roi_color, 1)
                
                # 标注名称
                roi_name = template["roi_names"][i] if i < len(template["roi_names"]) else f"Area {i+1}"
                cv2.putText(annotated_frame, roi_name, (nx1 + 5, ny1 + 20), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, roi_color, 1)
        except Exception as e:
            # 静默处理或简单提示，避免阻塞主循环
            cv2.putText(annotated_frame, f"Template Error: {os.path.basename(template_path)}", (10, h - 20), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        cv2.imshow("Smart Canteen Recognition", annotated_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            print("\n[MANUAL] 手动触发高精度分析...")
            snapshot_path = "manual_snapshot.png"
            cv2.imwrite(snapshot_path, frame)
            try:
                analyze_leftovers_sam(snapshot_path, sam_model)
                print("[MANUAL] 手动分析完成！")
            except Exception as e:
                print(f"[ERROR] 手动分析出错: {e}")
            last_analysis_time = time.time()
            # 排空缓冲区
            for _ in range(10): cap.read()

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_camera_segmentation()
