import cv2
import numpy as np
import os
import sys
import torch
from ultralytics import YOLO
from PIL import Image

# 添加“剩菜面积计算”目录到系统路径，以便导入原有模块
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
SAM_DIR = os.path.join(PROJECT_ROOT, "剩菜面积计算")
sys.path.append(SAM_DIR)

# 导入原有逻辑
from area_sam import load_sam_model, process_sam_image

class VisionService:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(VisionService, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
            
        # 1. 首先定义中文化映射表 (必须在加载模型前)
        self.food_name_map = {
            "ouhe": "藕合",
            "yuxiangrousi": "鱼香肉丝",
            "tudoudunniurou": "土豆炖牛肉",
            "rice": "米饭",
            "noodle": "面条",
            "qingcai": "清炒时蔬",
            "mifannigga": "米饭",
            "hongshaonirou": "红烧牛肉",
            "tray": "餐盘"
        }

        # 2. 配置路径
        self.yolo_model_path = r"F:\视觉识别食堂\标准框多菜品识别\runs\detect\train_tray_v1\weights\best.pt"
        
        print(">>> 正在初始化 VisionService (单例模式)...")
        # 3. 加载 YOLO 并同步名称
        try:
            self.yolo_model = YOLO(self.yolo_model_path)
            for idx, name in self.yolo_model.names.items():
                if name.lower() in self.food_name_map:
                    self.yolo_model.names[idx] = self.food_name_map[name.lower()]
            print("✅ YOLO 模型加载成功并已同步中文名称")
        except Exception as e:
            print(f"❌ YOLO 加载失败: {e}")
            self.yolo_model = None
            
        # 4. 加载 SAM
        try:
            self.sam_model = load_sam_model()
            print("✅ SAM 模型加载成功")
        except Exception as e:
            print(f"❌ SAM 加载失败: {e}")
            self.sam_model = None
            
        self.initialized = True
        self.cap = None
        self.latest_frame = None
        self.current_count = 0  # 实时物体计数

    def _get_cap(self):
        """延迟初始化摄像头"""
        if self.cap is None or not self.cap.isOpened():
            # 使用 DSHOW 提速 (Windows 推荐)
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        return self.cap

    def get_video_stream(self):
        """
        MJPEG 视频流生成器
        """
        cap = self._get_cap()
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # 更新缓存帧，供 capture_frame 使用
            self.latest_frame = frame.copy()
            
            # 运行 YOLO 推理
            if self.yolo_model:
                results = self.yolo_model(frame, verbose=False, conf=0.4)
                self.current_count = len(results[0].boxes)
                annotated_frame = results[0].plot()
            else:
                self.current_count = 0
                annotated_frame = frame
            
            # 转换为 JPEG
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    def capture_frame(self):
        """返回当前流中的最新帧"""
        return self.latest_frame

    def get_center_distance(self, box1, box2):
        """计算两个矩形中心点的距离"""
        c1 = (box1[0] + box1[2]/2, box1[1] + box1[3]/2)
        c2 = (box2[0] + box2[2]/2, box2[1] + box2[3]/2)
        return np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)

    async def analyze_tray(self, frame: np.ndarray, save_dir: str = "results"):
        """
        核心分析逻辑，集成 YOLO 识别品类和 SAM 计算面积
        """
        if self.yolo_model is None or self.sam_model is None:
            return None, "Models not loaded"

        if not os.path.exists(save_dir):
            os.makedirs(save_dir)

        filename = f"result_{int(torch.randint(0, 1000000, (1,)).item())}.png"
        result_save_path = os.path.join(save_dir, filename)

        # 1. SAM 分割与透视矫正
        overall_ratio, sam_results, warped_img = process_sam_image(
            frame, 
            self.sam_model, 
            result_save_path=result_save_path
        )
        
        # 2. 在矫正后的图上运行 YOLO 识别菜品名称
        warped_yolo_results = self.yolo_model(warped_img, verbose=False, conf=0.25)
        
        warped_detections = []
        warped_h, warped_w = warped_img.shape[:2]
        warped_area = warped_h * warped_w
        
        for box in warped_yolo_results[0].boxes:
            cls_id = int(box.cls[0])
            cls_name = self.yolo_model.names[cls_id]
            x, y, w, h = box.xywh[0].cpu().numpy()
            box_area = w * h
            
            # 过滤面积过大的误报
            if box_area / warped_area > 0.35:
                continue
                
            top_left_box = (x - w/2, y - h/2, w, h)
            warped_detections.append({
                'name': cls_name, 
                'box': top_left_box, 
                'is_rice': cls_name.lower() == 'rice'
            })

        # 3. 空间匹配
        final_items = []
        for grid_item in sam_results:
            grid_rect = grid_item['grid_rect'] # x, y, w, h
            grid_name = grid_item['name']
            best_match_name = None
            min_dist = 99999
            
            for det in warped_detections:
                if det.get('is_rice', False) and '米饭' not in grid_name:
                    continue
                
                d = self.get_center_distance(grid_rect, det['box'])
                if d < min(grid_rect[2], grid_rect[3]) * 0.8:
                    if d < min_dist:
                        min_dist = d
                        best_match_name = det['name']
            
            # 获取中文名称
            display_name = self.food_name_map.get(best_match_name, best_match_name) if best_match_name else grid_name
            
            final_items.append({
                "category": display_name,
                "waste_rate": round(grid_item['ratio'], 2),
                "original_grid": grid_name
            })

        return {
            "total_waste_rate": round(overall_ratio, 2),
            "items": final_items,
            "result_image": filename
        }, None

# 辅助函数，确保单例初始化
def get_vision_service():
    return VisionService()
