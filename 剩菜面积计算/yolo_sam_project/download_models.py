import os
import urllib.request

def download_file(url, save_path):
    if os.path.exists(save_path):
        print(f"文件已存在: {save_path}, 跳过下载。")
        return
    
    print(f"正在从 {url} 下载文件...")
    try:
        urllib.request.urlretrieve(url, save_path)
        print(f"下载成功: {save_path}")
    except Exception as e:
        print(f"下载失败: {e}")

def main():
    # 获取当前脚本所在目录的 models 文件夹
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        
    # 模型下载列表
    models_to_download = [
        {
            "name": "yolov8n.pt",
            "url": "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
        },
        {
            "name": "sam_vit_b.pth",
            "url": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
        }
    ]
    
    for model in models_to_download:
        save_path = os.path.join(models_dir, model["name"])
        download_file(model["url"], save_path)

if __name__ == "__main__":
    main()
