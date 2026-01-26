"""
剩菜面积计算 - SAM 深度学习版本 (透视矫正增强版)
使用 Segment Anything Model (SAM) 进行精确食物分割
支持基于自动轮廓提取的透视对齐，解决不锈钢反光干扰
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
import torch
from segment_anything import sam_model_registry, SamPredictor
import matplotlib
from PIL import Image, ImageDraw, ImageFont
import json
import warnings

# 忽略来自 segment_anything/pytorch 的 FutureWarning (关于 weights_only=False)
warnings.filterwarnings("ignore", category=FutureWarning, module="segment_anything")
# 或者更通用的方式：
warnings.filterwarnings("ignore", message=".*weights_only=False.*")

matplotlib.use('Agg') # 禁止弹出窗口，直接生成文件

# 配置字体以支持中文显示
def setup_matplotlib_fonts():
    fonts = ['Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
    for font in fonts:
        if font in [f.name for f in matplotlib.font_manager.fontManager.ttflist]:
            matplotlib.rcParams['font.sans-serif'] = [font]
            break
    matplotlib.rcParams['axes.unicode_minus'] = False

setup_matplotlib_fonts()

def draw_chinese_text(img, text, position, font_size=25, color=(0, 255, 255)):
    """在 OpenCV 图像上绘制中文文本"""
    img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil)
    try:
        font_path = "C:/Windows/Fonts/msyh.ttc" if os.path.exists("C:/Windows/Fonts/msyh.ttc") else "C:/Windows/Fonts/simhei.ttf"
        font = ImageFont.truetype(font_path, font_size)
    except:
        font = ImageFont.load_default()
    
    draw.text(position, text, font=font, fill=color)
    return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

def adjust_gamma(image, gamma=1.0):
    """Gamma 校正：压低高光反光 (gamma < 1.0)"""
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image, table)

def get_texture_score(img_gray, mask):
    """计算 Mask 区域的纹理密度 (Canny 边缘像素占比)"""
    if mask is None or cv2.countNonZero(mask) == 0:
        return 0.0
    edges = cv2.Canny(img_gray, 50, 150)
    masked_edges = cv2.bitwise_and(edges, edges, mask=mask)
    edge_pixel_count = cv2.countNonZero(masked_edges)
    total_pixel_count = cv2.countNonZero(mask)
    return edge_pixel_count / total_pixel_count

def get_laplacian_variance(img_gray, mask):
    """计算 Mask 区域的拉普拉斯方差 (衡量锐度/颗粒感)"""
    if mask is None or cv2.countNonZero(mask) == 0:
        return 0.0
    # 裁剪到 Mask 范围以提高效率
    x, y, w, h = cv2.boundingRect(mask)
    roi = img_gray[y:y+h, x:x+w]
    roi_mask = mask[y:y+h, x:x+w]
    # 计算拉普拉斯算子
    laplacian = cv2.Laplacian(roi, cv2.CV_64F)
    # 只计算 Mask 区域内的方差
    values = laplacian[roi_mask > 0]
    if len(values) == 0: return 0.0
    return np.var(values)

# 配置
MODEL_TYPE = "vit_b"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "sam_vit_b.pth")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def load_sam_model():
    """加载 SAM 模型"""
    print(f"正在加载 SAM 模型 ({DEVICE})...")
    sam = sam_model_registry[MODEL_TYPE](checkpoint=MODEL_PATH)
    sam.to(device=DEVICE)
    return sam

def order_points(pts):
    """对四个角点进行排序：左上，右上，右下，左下"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)] # 左上
    rect[2] = pts[np.argmax(s)] # 右下
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # 右上
    rect[3] = pts[np.argmax(diff)] # 左下
    return rect

def warp_plate_to_template(img, template_size=(1024, 589)):
    """
    找到图像中最大的矩形轮廓（餐盘），并将其透视变换为标准模板尺寸
    """
    img_h, img_w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. 预处理：增强对比度 + 边缘检测
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_adj = clahe.apply(gray)
    blurred = cv2.GaussianBlur(gray_adj, (5, 5), 0)
    edged = cv2.Canny(blurred, 30, 150)

    # 2. 寻找轮廓
    cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return cv2.resize(img, template_size), False

    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    plate_cnt = None

    for c in cnts[:5]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        # 候选条件：4 个角点且面积足够大 (占画面 15% 以上)
        if len(approx) == 4 and cv2.contourArea(c) > (img_h * img_w * 0.15):
            plate_cnt = approx
            break

    # 如果找不到完美的 4 角轮廓，尝试使用最小外接矩形
    if plate_cnt is None and len(cnts) > 0:
        area = cv2.contourArea(cnts[0])
        if area > (img_h * img_w * 0.15):
            rect = cv2.minAreaRect(cnts[0])
            box = cv2.boxPoints(rect)
            plate_cnt = np.int32(box)

    if plate_cnt is None:
        return cv2.resize(img, template_size), False

    # 3. 执行透视变换
    src_pts = plate_cnt.reshape(4, 2)
    src_pts = order_points(src_pts)

    dst_pts = np.array([
        [0, 0],
        [template_size[0] - 1, 0],
        [template_size[0] - 1, template_size[1] - 1],
        [0, template_size[1] - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, M, template_size)
    return warped, True

def detect_plate_regions(img):
    """
    基于透视矫正后的标准图像套用模板或默认值
    """
    template_path = os.path.join(os.path.dirname(__file__), "plate_template.json")
    if os.path.exists(template_path):
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                t_data = json.load(f)
                return [tuple(r) for r in t_data["rois"]]
        except:
            pass
            
    # 默认回退值 (基于 1024x589)
    return [
        (320, 60, 220, 240),   (565, 60, 220, 240),
        (45, 330, 280, 240),   (340, 410, 440, 160),
    ]

def is_food_mask(mask, img_hsv, img_gray, roi_box, region_name=""):
    """
    判断 mask 是否为食物，结合颜色、亮度、纹理密度和颗粒感特征
    region_name: 区域名称，用于对米饭区进行特殊处理
    """
    x1, y1, w, h = roi_box
    x2, y2 = x1 + w, y1 + h
    
    # 判断是否为米饭区
    is_rice_region = '米饭' in region_name

    # 提取 ROI 区域
    mask_roi = mask[y1:y2, x1:x2]
    hsv_roi = img_hsv[y1:y2, x1:x2]
    gray_roi = img_gray[y1:y2, x1:x2]

    # 基础校验
    if mask_roi.size == 0: return False, 0
    non_zero_pixels = cv2.countNonZero(mask_roi.astype(np.uint8))
    if non_zero_pixels < 50: return False, 0

    # 获取 Mask 区域内的特征值
    masked_hsv = hsv_roi[mask_roi > 0]
    if len(masked_hsv) == 0: return False, 0

    avg_saturation = np.mean(masked_hsv[:, 1])
    avg_value = np.mean(masked_hsv[:, 2])
    
    # 1. 纹理与颗粒感校验 (核心优化点：区分金属与米饭)
    texture_score = get_texture_score(gray_roi, mask_roi)
    laplacian_var = get_laplacian_variance(gray_roi, mask_roi)
    
    # [LOG] 打印所有关键指标以供提示
    lap_v_global = laplacian_var # 保持局部变量名一致
    # 打印每个候选 Mask 的详细特征
    print(f"    - [DEBUG] Mask Scan: S={avg_saturation:.1f}, V={avg_value:.1f}, Lap={laplacian_var:.1f}, Tex={texture_score:.3f}, Rice={is_rice_region}")

    # 2. 核心判定逻辑
    
    # 彩色食物 (饱和度较高)
    if avg_saturation > 35: # 提升饱和度门槛，减少反射环境色导致的误判
        return True, 1.0

    # 深色食物 (亮度极低)
    if avg_value < 65:
        return True, 1.0

    # 白色食物 (米饭、豆腐) - 重点排查区
    if avg_saturation < 30 and avg_value > 160:
        # 米饭由于米粒间的阴影，具有极高的纹理密度
        # 但对于米饭区，我们放宽纹理要求，因为满满的白米饭纹理确实较低
        
        # === 【优化 2】 米饭区使用极低的纹理阈值 ===
        texture_threshold = 0.01 if is_rice_region else 0.35
        if texture_score < texture_threshold:
            print(f"    [排除] 疑似盘底反光 (亮白但光滑): Tex={texture_score:.3f}")
            return False, 0.0
        
        # 对于米饭区，直接通过
        if is_rice_region:
            return True, 1.0
        
        # 拉普拉斯方差也要配合检查
        if laplacian_var > 1500:
            return True, 1.0
        
        return False, 0.0

    # === 【优化 3】 针对高光盘底的终极防御 ===
    # 如果亮度极高 (反光)，除非纹理极其极其丰富 (乱糟糟的剩饭)，否则一律杀掉
    # 但对米饭区放宽限制
    if avg_value > 200:
        texture_req = 0.01 if is_rice_region else 0.45
        if texture_score < texture_req:
            print(f"    [排除] 高光区域纹理不足: V={avg_value:.1f}, Tex={texture_score:.3f}")
            return False, 0.0
        if is_rice_region:
            return True, 1.0

    # 3. 滑动判定：如果既没颜色，纹理又不强，则视为盘底
    # 对米饭区放宽基准
    if is_rice_region:
        return True, 1.0  # 米饭区只要通过了前面的校验，就认为是食物
    
    if laplacian_var < 750 or texture_score < 0.15:
        return False, 0.0

    return False, 0.0

def process_sam_image(img, sam_model, result_save_path=None):
    """
    核心 SAM 分析逻辑，接受 OpenCV 图像数组
    result_save_path: 如果不为 None，则保存分析图到该路径
    """
    if img is None:
        print("错误：无效的图像数据")
        return None, []
    
    # 1. 透视矫正与预处理
    target_size = (1024, 589)
    img_processed, is_warped = warp_plate_to_template(img, template_size=target_size)
    
    # === 新增：Gamma 校正压制反光 ===
    img_processed = adjust_gamma(img_processed, gamma=0.85)
    
    img_rgb = cv2.cvtColor(img_processed, cv2.COLOR_BGR2RGB)
    img_hsv = cv2.cvtColor(img_processed, cv2.COLOR_BGR2HSV)
    img_gray = cv2.cvtColor(img_processed, cv2.COLOR_BGR2GRAY)
    img_h, img_w = img_processed.shape[:2]
    
    # 2. SAM Predictor 初始化 (由 Generator 切换)
    print("正在进行深度学习分割 (Box Prompt 模式)...")
    predictor = SamPredictor(sam_model)
    predictor.set_image(img_rgb)
    
    # 获取格子 ROI
    detected_rois = detect_plate_regions(img_processed)
    print(f"已加载 {len(detected_rois)} 个餐盘分格 ROI")
    
    # 3. 分析每个格子
    results = []
    combined_food_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    total_food_pixels = 0
    total_plate_capacity = 0

    default_names = ["菜品区 1 (左上)", "菜品区 2 (右中)", "菜品区 3 (左长格)", "米饭区 (下长格)"]

    for idx, roi in enumerate(detected_rois):
        rx, ry, rw, rh = roi
        x1, y1 = max(0, int(rx)), max(0, int(ry))
        x2, y2 = min(img_w, int(rx + rw)), min(img_h, int(ry + rh))
        
        if x2 <= x1 or y2 <= y1:
            continue
            
        name = default_names[idx] if idx < len(default_names) else f"区域 {idx + 1}"
        roi_area = (x2 - x1) * (y2 - y1)
        
        # === 核心逻辑：使用 Box Prompt 分割 ===
        input_box = np.array([x1, y1, x2, y2])
        masks, scores, _ = predictor.predict(
            box=input_box,
            multimask_output=True # 返回多个尺度，通常中间那个最准
        )
        
        # 挑选最高分且面积合理的 Mask
        food_mask_in_roi = np.zeros((y2 - y1, x2 - x1), dtype=np.uint8)
        best_mask = None
        best_score = -1
        
        for m_idx, m in enumerate(masks):
            # 将全局 mask 裁剪到 ROI
            m_captured = m.astype(np.uint8)
            m_roi = m_captured[y1:y2, x1:x2]
            
            mask_pixel_count = cv2.countNonZero(m_roi)
            if mask_pixel_count < 100: continue # 提高最小面积限制
            
            # 过滤掉几乎填满整个格子的 Mask (通常是格子背景)
            # 只有当格子真的全是米饭时才允许高比例，但此时必须通过纹理校验
            coverage = mask_pixel_count / roi_area
            
            # === 【优化 1】 强力拦截：如果 Mask 填满了格子，它一定是盘底，不是剩菜 ===
            # 但对米饭区放宽限制，因为米饭确实可能填满整个格子
            is_rice_region = '米饭' in name
            coverage_threshold = 0.95 if is_rice_region else 0.85  # 米饭区允许更高覆盖率
            if coverage > coverage_threshold:
                print(f"  [忽略] Mask-{m_idx} 面积过大 ({coverage:.1%})，判定为盘底背景")
                continue
            # ===================================================================
            
            # 校验是否为食物
            lap_v = get_laplacian_variance(img_gray[y1:y2, x1:x2], m_roi)
            # 打印调试信息，帮助现场分析
            if coverage > 0.2:
                 print(f"  [ROI:{idx}] Mask-{m_idx}: Cov={coverage:.2f}, Lap={lap_v:.1f}, Score={scores[m_idx]:.2f}")
            
            is_food, _ = is_food_mask(m_captured, img_hsv, img_gray, (x1, y1, x2-x1, y2-y1), region_name=name)
            
            if is_food and scores[m_idx] > best_score:
                best_score = scores[m_idx]
                best_mask = m_roi

        if best_mask is not None:
            # === 后处理：形态学滤波 ===
            kernel = np.ones((3,3), np.uint8)
            best_mask = cv2.morphologyEx(best_mask, cv2.MORPH_OPEN, kernel, iterations=1) # 去噪
            best_mask = cv2.morphologyEx(best_mask, cv2.MORPH_CLOSE, kernel, iterations=1) # 填洞
            food_mask_in_roi = (best_mask * 255).astype(np.uint8)
        
        food_pixels = cv2.countNonZero(food_mask_in_roi)
        # 基准容积：使用 100% 的格子面积作为分母
        grid_capacity = roi_area * 1.0
        ratio = min((food_pixels / grid_capacity) * 100, 100.0) if grid_capacity > 0 else 0
        
        total_food_pixels += food_pixels
        total_plate_capacity += grid_capacity
        
        results.append({
            "name": name,
            "food_pixels": food_pixels,
            "ratio": ratio,
            "roi": (x1, y1, x2-x1, y2-y1),
            "mask": food_mask_in_roi,
            "grid_rect": (x1, y1, x2-x1, y2-y1) # 增加 rect 信息方便外部调用
        })
        
        combined_food_mask[y1:y2, x1:x2] = cv2.bitwise_or(combined_food_mask[y1:y2, x1:x2], food_mask_in_roi)

    overall_ratio = (total_food_pixels / total_plate_capacity) * 100 if total_plate_capacity > 0 else 0
    overall_ratio = min(overall_ratio, 100.0)

    # 5. 打印报告
    print(f"\n{'='*40}")
    print(f"{'分格名称':<15} | {'食物覆盖像素':<12} | {'剩余比例'}")
    print("-" * 40)
    for r in results:
        print(f"{r['name']:<15} | {r['food_pixels']:<12} | {r['ratio']:.1f}%")
    print("-" * 40)
    print(f"【汇总】全盘总剩余率: {overall_ratio:.1f}%")
    print(f"{'='*40}\n")

    # 6. 可视化 (仅当指定保存路径时)
    if result_save_path:
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        fig.suptitle(f"自适应剩菜面积计算仪表盘 (全盘剩余率: {overall_ratio:.1f}%)", fontsize=16)
        
        axes[0, 0].imshow(img_rgb)
        axes[0, 0].set_title("1. 透视矫正后图像")
        axes[0, 0].axis('off')
        
        overlay_rois = img_processed.copy()
        for r in results:
            x, y, w, h = r["roi"]
            cv2.rectangle(overlay_rois, (x, y), (x+w, y+h), (0, 255, 0), 3)
            overlay_rois = draw_chinese_text(overlay_rois, r["name"], (x + 5, y + 5))
        axes[0, 1].imshow(cv2.cvtColor(overlay_rois, cv2.COLOR_BGR2RGB))
        axes[0, 1].set_title("2. 自动分格检测")
        axes[0, 1].axis('off')
        
        axes[0, 2].imshow(combined_food_mask, cmap='hot')
        axes[0, 2].set_title("3. 全盘食物提取 Mask")
        axes[0, 2].axis('off')
        
        for idx, r in enumerate(results[:3]):
            x, y, w, h = r["roi"]
            roi_img = img_rgb[y:y+h, x:x+w]
            axes[1, idx].imshow(roi_img)
            food_overlay = np.zeros_like(roi_img)
            food_overlay[r["mask"] > 0] = [0, 255, 0]
            axes[1, idx].imshow(food_overlay, alpha=0.3)
            axes[1, idx].set_title(f"{r['name']}: {r['ratio']:.1f}%")
            axes[1, idx].axis('off')
        
        plt.tight_layout()
        plt.savefig(result_save_path)
        print(f"详细分析图已保存至: {result_save_path}")
        plt.close(fig) # 释放内存
    
    return overall_ratio, results, img_processed

def analyze_leftovers_sam(image_path, sam_model):
    """
    文件兼容层
    """
    img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        print("错误：未找到图片")
        return None
    
    result_path = image_path.replace('.png', '_summary.png').replace('.jpg', '_summary.jpg')
    overall_ratio, _, _ = process_sam_image(img, sam_model, result_save_path=result_path)
    return overall_ratio

def main():
    picture_dir = r"F:\视觉识别食堂\剩菜面积计算\picture"
    if not os.path.exists(MODEL_PATH):
        print(f"错误：未找到 SAM 模型文件: {MODEL_PATH}")
        return
    
    sam_model = load_sam_model()
    for filename in os.listdir(picture_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')) and '_result' not in filename:
            image_path = os.path.join(picture_dir, filename)
            analyze_leftovers_sam(image_path, sam_model)

if __name__ == "__main__":
    main()
