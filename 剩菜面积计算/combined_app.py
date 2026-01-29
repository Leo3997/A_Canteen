"""
Combined Food Recognition & Leftover Analysis System
集成 YOLOv8 (菜品识别) 和 SAM (剩菜面积计算) 的综合应用
"""

import cv2
import numpy as np
import time
import os
import sys
import json
from ultralytics import YOLO
import torch

# 引入 SAM 分析模块
# 假设当前脚本在 f:\视觉识别食堂\剩菜面积计算\ 目录下
sys.path.append(os.path.dirname(__file__))
from area_sam import load_sam_model, process_sam_image, draw_chinese_text

# ================= 配置 =================
# YOLO 模型路径 (名字识别)
YOLO_MODEL_PATH = "E:\\实习相关\\杭州得鹿山\\智慧食堂\\标准框多菜品识别\\runs\\detect\\train_tray_v1\\weights\\best.pt"
# 摄像头
CAMERA_INDEX = 0
# 稳定性检测参数
COOLDOWN_SEC = 3         # 分析后的冷却时间
# 模板路径
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "plate_template.json")
# =======================================

def load_plate_template():
    """加载餐盘模板数据"""
    if os.path.exists(TEMPLATE_PATH):
        try:
            with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load template: {e}")
    return None

def draw_guide_overlay(frame, template):
    """
    在画面上绘制餐盘和分格引导线
    注意：模板坐标是基于 1024x589 的，我们需要将其缩放到当前 frame 大小
    """
    if template is None: return frame
    
    h, w = frame.shape[:2]
    t_w, t_h = template.get("image_size", [1024, 589])
    
    scale_x = w / t_w
    scale_y = h / t_h
    
    # 绘制分格
    rois = template.get("rois", [])
    names = template.get("roi_names", [])
    
    for i, roi in enumerate(rois): # roi: [x, y, w, h]
        rx, ry, rw, rh = roi
        
        # 坐标变换
        x1 = int(rx * scale_x)
        y1 = int(ry * scale_y)
        x2 = int((rx + rw) * scale_x)
        y2 = int((ry + rh) * scale_y)
        
        # 绘制虚线框 (OpenCV 没有直接虚线，用细线代替或自行实现，这里用绿色细线)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
        
        # 绘制名称
        name = names[i] if i < len(names) else f"Region {i+1}"
        # 简略显示，避免遮挡
        cv2.putText(frame, str(i+1), (x1+5, y1+20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    return frame

def get_center_distance(box1, box2):
    """计算两个矩形中心点的距离"""
    c1 = (box1[0] + box1[2]/2, box1[1] + box1[3]/2)
    c2 = (box2[0] + box2[2]/2, box2[1] + box2[3]/2)
    return np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)

def run_combined_system():
    # 1. 初始化
    print(">>> 正在加载 YOLO 模型...")
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
    except Exception as e:
        print(f"❌ 无法加载 YOLO 模型: {e}")
        return

    print(">>> 正在加载 SAM 模型...")
    try:
        sam_model = load_sam_model()
    except Exception as e:
        print(f"❌ 无法加载 SAM 模型: {e}")
        return
    
    # 加载模板
    template_data = load_plate_template()
    if template_data:
        print(f"✅ 已加载餐盘模板: {len(template_data.get('rois', []))} 个区域")
    else:
        print("⚠️ 未找到餐盘模板，引导功能将禁用")

    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print("❌ 无法打开摄像头")
        return

    print("\n✅ 系统就绪！")
    print("   - 实时识别运行中")
    print("   - 按 's' 键手动触发分析")
    print("   - 按 'q' 键退出")

    # 状态变量
    last_analysis_time = 0
    latest_report = None 
    report_display_timer = 0 
    
    # 结果展示窗口
    cv2.namedWindow("Smart Canteen System", cv2.WINDOW_NORMAL)

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        current_time = time.time()
        
        # --- A. 实时 YOLO 检测 ---
        # 绘制检测框
        results = yolo_model(frame, verbose=False, conf=0.4)
        result = results[0]
        annotated_frame = result.plot()
        
        # --- A2. 绘制餐盘引导线 ---
        if template_data:
            draw_guide_overlay(annotated_frame, template_data)
        
        # --- C. 状态 UI ---
        cooldown_rem = max(0, COOLDOWN_SEC - (current_time - last_analysis_time))
        
        if cooldown_rem > 0:
            status_text = f"Cooldown: {cooldown_rem:.1f}s"
            status_color = (100, 100, 100)
        else:
            status_text = "Ready (Press 's')"
            status_color = (0, 255, 0) # Green

        # 按键检测
        key_pressed = cv2.waitKey(1) & 0xFF
        if key_pressed == ord('q'):
            break
        
        # 触发分析
        if key_pressed == ord('s') and cooldown_rem <= 0:
            print("\n>>> 🟢 手动触发高精度分析...")
            status_text = "ANALYZING..."
            status_color = (0, 0, 255) # Red
            
            cv2.putText(annotated_frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
            cv2.imshow("Smart Canteen System", annotated_frame)
            cv2.waitKey(1)
            
            # 2. 执行核心分析链
            snapshot_path = f"snapshot_{int(current_time)}.jpg"
            result_save_path = snapshot_path.replace(".jpg", "_result.png")
            
            overall_ratio, sam_results, warped_img = process_sam_image(
                frame, 
                sam_model, 
                result_save_path=result_save_path
            )
            
            # 显示结果图
            if os.path.exists(result_save_path):
                # 读取并显示结果图
                res_img = cv2.imread(result_save_path)
                if res_img is not None:
                    cv2.imshow("Analysis Result", res_img)
                    print("    > 结果图已显示")
            
            # 3. 融合 YOLO 结果来修正菜名
            print("    > 正在校正菜品名称...")
            warped_yolo_results = yolo_model(warped_img, verbose=False, conf=0.25)
            
            warped_detections = []
            warped_h, warped_w = warped_img.shape[:2]
            warped_area = warped_h * warped_w
            
            for box in warped_yolo_results[0].boxes:
                cls_id = int(box.cls[0])
                cls_name = yolo_model.names[cls_id]
                # box format: x, y, w, h
                x, y, w, h = box.xywh[0].cpu().numpy()
                box_area = w * h
                
                # === 过滤 1：排除面积过大的检测框（可能是把餐盘识别为主食）===
                area_ratio = box_area / warped_area
                if area_ratio > 0.35:  # 占图像超过 35% 的框视为误识别
                    print(f"    [过滤] 检测框 '{cls_name}' 面积过大 ({area_ratio:.1%})，疑似餐盘误识别")
                    continue
                
                top_left_box = (x - w/2, y - h/2, w, h)
                warped_detections.append({'name': cls_name, 'box': top_left_box, 'conf': float(box.conf[0]), 'is_rice': cls_name.lower() == 'rice'})


            final_report_items = []
            
            for grid_item in sam_results:
                grid_rect = grid_item['grid_rect'] # x, y, w, h
                grid_name = grid_item['name']
                best_match_name = None
                min_dist = 99999
                
                # 寻找匹配的 YOLO 框
                for det in warped_detections:
                    # === 过滤 2：rice 类别只能匹配米饭区 ===
                    if det.get('is_rice', False) and '米饭' not in grid_name:
                        continue  # rice 不能匹配非米饭区域
                    
                    d = get_center_distance(grid_rect, det['box'])
                    # 只有当距离在一定范围内才算匹配 (例如半个格子宽度)
                    if d < min(grid_rect[2], grid_rect[3]) * 0.8: 
                        if d < min_dist:
                            min_dist = d
                            best_match_name = det['name']
                
                final_name = best_match_name if best_match_name else grid_item['name']
                grid_item['display_name'] = final_name
                final_report_items.append(grid_item)
                print(f"    [Match] Grid '{grid_item['name']}' -> Detected '{best_match_name}' (Left: {grid_item['ratio']:.1f}%)")

            # 4. 生成本次报告对象
            latest_report = {
                "items": final_report_items,
                "total_ratio": overall_ratio,
                "timestamp": current_time
            }
            report_display_timer = time.time() + 5.0 # 显示 5 秒
            
            # 重置状态
            last_analysis_time = time.time()
            for _ in range(5): cap.read() # Clear buffer

        # --- D. 绘制 UI ---
        # 1. 状态栏
        cv2.putText(annotated_frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
        
        # 2. 如果有最近的报告，且在显示时间内，叠加显示
        if latest_report and time.time() < report_display_timer:
            # 绘制半透明背景板
            h, w = frame.shape[:2]
            overlay = annotated_frame.copy()
            cv2.rectangle(overlay, (w - 350, 0), (w, 400), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.6, annotated_frame, 0.4, 0, annotated_frame)
            
            # 绘制文字
            cx = w - 330
            cy = 40
            cv2.putText(annotated_frame, "Analysis Report", (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cy += 40
            cv2.putText(annotated_frame, f"Total Left: {latest_report['total_ratio']:.1f}%", (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cy += 20
            
            for item in latest_report['items']:
                cy += 30
                line = f"{item['display_name']}: {item['ratio']:.1f}%"
                cv2.putText(annotated_frame, line, (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("Smart Canteen System", annotated_frame)


    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_combined_system()
