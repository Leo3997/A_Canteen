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
from .config_service import get_config_service

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
            "shuizhuroupian": "水煮肉片",
            "qingjiaochaorou": "青椒炒肉",
            "mantou": "馒头",
            "tray": "餐盘"
        }

        # 2. 配置路径
        self.yolo_model_path = r"F:\视觉识别食堂\标准框多菜品识别\runs\detect\train_tray_v1\weights\best.pt"
        
        print(">>> 正在初始化 VisionService (单例模式)...")
        # 3. 加载 YOLO 并同步名称
        try:
            self.yolo_model = YOLO(self.yolo_model_path)
            for idx, name in self.yolo_model.names.items():
                normalized_name = name.lower().strip()
                if normalized_name in self.food_name_map:
                    self.yolo_model.names[idx] = self.food_name_map[normalized_name]
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
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f">>> 推理设备: {self.device}")

    def _get_cap(self):
        """延迟初始化摄像头"""
        if self.cap is None or not self.cap.isOpened():
            config = get_config_service().get_config()
            src = config.get("system", {}).get("camera_index", 0)
            
            # 使用 DSHOW 提速 (Windows 推荐)
            self.cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)
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
            
            # 运行 YOLO 推理 (恢复满帧推理以保证视觉流畅度)
            if self.yolo_model:
                results = self.yolo_model(frame, verbose=False, conf=0.4, device=self.device)
                self.current_count = len(results[0].boxes)
                self.annotated_frame = results[0].plot()
                
                annotated_frame = self.annotated_frame
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
        heatmap_filename = filename.replace(".png", "_heatmap.png")
        result_save_path = os.path.join(save_dir, filename)
        heatmap_save_path = os.path.join(save_dir, heatmap_filename)

        # 封装同步 CPU 任务，以便在线程池中运行
        def sync_analysis_task():
            # 0. 读取配置
            config = get_config_service().get_config()
            rec_config = config.get("recognition", {})
            gamma = rec_config.get("gamma_correction", 1.0)
            conf_thres = rec_config.get("confidence_threshold", 0.45)
            enable_sam = rec_config.get("enable_sam", True)
            
            nonlocal frame
            # 应用 Gamma 矫正
            if gamma != 1.0:
                 invGamma = 1.0 / gamma
                 table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
                 frame = cv2.LUT(frame, table)

            # 1. SAM 分割与透视矫正
            if enable_sam:
                overall_ratio, sam_results, warped_img = process_sam_image(
                    frame, 
                    self.sam_model, 
                    result_save_path=result_save_path
                )
            else:
                overall_ratio = 0.0
                sam_results = []
                warped_img = frame.copy()
                cv2.imwrite(result_save_path, warped_img)

            return overall_ratio, sam_results, warped_img, enable_sam, conf_thres

        # 在线程池中执行同步任务
        import asyncio
        overall_ratio, sam_results, warped_img, enable_sam, conf_thres = await asyncio.to_thread(sync_analysis_task)

        # === 4. 生成复杂度热力图 (仅 SAM 模式下) ===
        # heatmap_filename 已经在上方定义，这里不需要重新初始化为 None，
        # 除非生成失败或者是非 SAM 模式，才需要在返回前处理。
        
        if enable_sam:
            try:
                warped_gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
                sobelx = cv2.Sobel(warped_gray, cv2.CV_64F, 1, 0, ksize=3)
                sobely = cv2.Sobel(warped_gray, cv2.CV_64F, 0, 1, ksize=3)
                mag = cv2.magnitude(sobelx, sobely)
                
                # 改进归一化：忽略极高端 2% 的反光噪点，防止颜色被压平
                v_max = np.percentile(mag, 98)
                if v_max <= 0: v_max = 1.0
                
                # 线性拉伸并裁剪
                mag_norm = np.clip(mag / v_max, 0, 1)
                
                # 非线性增强：使用平方增强纹理对比度 (使得红黄绿层次分明)
                mag_norm = np.power(mag_norm, 0.8) # 略微拉高暗部，使得细节更明显
                mag_byte = (mag_norm * 255).astype(np.uint8)
                
                # 应用伪彩色 (Jet)
                heatmap = cv2.applyColorMap(mag_byte, cv2.COLORMAP_JET)
                
                # 叠加原图：增加热力图占比 (0.3 原图 + 0.7 热力图)，使颜色更鲜艳
                heatmap_overlay = cv2.addWeighted(warped_img, 0.3, heatmap, 0.7, 0)
                cv2.imwrite(heatmap_save_path, heatmap_overlay)
            except Exception as e:
                print(f"⚠️ 热力图生成失败: {e}")
                heatmap_filename = None
        else:
             heatmap_filename = None
        
        # 2. 在矫正后的图上运行 YOLO 识别菜品名称
        warped_yolo_results = self.yolo_model(warped_img, verbose=False, conf=conf_thres)
        
        confidences = []
        warped_detections = []
        warped_h, warped_w = warped_img.shape[:2]
        warped_area = warped_h * warped_w
        
        for box in warped_yolo_results[0].boxes:
            cls_id = int(box.cls[0])
            cls_name = self.yolo_model.names[cls_id]
            x, y, w, h = box.xywh[0].cpu().numpy()
            box_area = w * h
            
            # 针对不同类别应用动态置信度阈值
            category_conf_threshold = conf_thres
            normalized_name = cls_name.lower().strip()
            
            # 米饭和餐盘识别通常较稳，但米饭空盘反光易误报，需提高门槛
            if normalized_name in ["noodle", "mantou"]:
                category_conf_threshold = min(0.6, conf_thres + 0.1)
            elif normalized_name == "rice":
                category_conf_threshold = max(0.50, conf_thres + 0.05) # 提高米饭门槛
            elif normalized_name == "tray":
                category_conf_threshold = max(0.35, conf_thres - 0.05)

            if box.conf[0].cpu().numpy() < category_conf_threshold:
                continue

            # 过滤面积过大的误报
            if box_area / warped_area > 0.35:
                continue
                
            top_left_box = (x - w/2, y - h/2, w, h)
            warped_detections.append({
                'name': cls_name, 
                'box': top_left_box, 
                'is_rice': normalized_name == 'rice'
            })
            confidences.append(float(box.conf[0].cpu().numpy()))

        # 3. 空间匹配
        final_items = []
        if enable_sam:
            # SAM 模式：将 YOLO 框匹配到 SAM 网格
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
                if best_match_name:
                    normalized_match = best_match_name.lower().strip()
                    display_name = self.food_name_map.get(normalized_match, best_match_name)
                else:
                    display_name = "未录入菜品"
                
                final_items.append({
                    "category": display_name,
                    "waste_rate": round(grid_item['ratio'], 2),
                    "original_grid": grid_name
                })
        else:
            # 极速模式：直接列出识别到的物体
            for det in warped_detections:
                raw_name = det['name']
                normalized_name = raw_name.lower().strip()
                display_name = self.food_name_map.get(normalized_name, raw_name)
                
                final_items.append({
                    "category": display_name,
                    "waste_rate": 0.0, # 不计算剩菜率
                    "original_grid": "全图模式"
                })

        return {
            "total_waste_rate": round(overall_ratio, 2),
            "items": final_items,
            "result_image": filename,
            "heatmap_image": heatmap_filename,
            "average_confidence": round(float(np.mean(confidences)), 3) if confidences else 0.0
        }, None

# 辅助函数，确保单例初始化
def get_vision_service():
    return VisionService()
