
import json
import os
import shutil
from typing import Dict, Any

CONFIG_FILE = "config.json"

DEFAULT_CONFIG = {
    "recognition": {
        "confidence_threshold": 0.45,
        "enable_sam": True,
        "auto_perspective": True,
        "gamma_correction": 1.0
    },
    "ai": {
        "api_key": "",  # 用户需自行填写，或使用默认硬编码作为回退
        "model": "qwen-turbo",
        "system_prompt": "你是一位专业的智慧食堂经营分析专家。请通过分析食堂的剩菜数据（如浪费率、走势、热门菜品等）提供经营建议。"
    },
    "system": {
        "camera_index": 0,
        "cooldown_seconds": 3,
        "auto_mode": True
    }
}

class ConfigService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigService, cls).__new__(cls)
            cls._instance.load_config()
        return cls._instance

    def load_config(self):
        """加载配置，如果不存在则创建默认配置"""
        if not os.path.exists(CONFIG_FILE):
            self.config = DEFAULT_CONFIG.copy()
            self.save_config()
        else:
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
                # 简单的合并策略：确保新添加的默认键值存在
                self._merge_defaults(self.config, DEFAULT_CONFIG)
            except Exception as e:
                print(f"Error loading config: {e}. Using defaults.")
                self.config = DEFAULT_CONFIG.copy()

    def _merge_defaults(self, current: Dict, defaults: Dict):
        changed = False
        for k, v in defaults.items():
            if k not in current:
                current[k] = v
                changed = True
            elif isinstance(v, dict) and isinstance(current[k], dict):
                if self._merge_defaults(current[k], v):
                    changed = True
        if changed:
            self.save_config()
        return changed

    def save_config(self):
        """保存当前配置到文件"""
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving config: {e}")

    def get_config(self) -> Dict[str, Any]:
        return self.config

    def update_config(self, new_config: Dict[str, Any]):
        """更新配置"""
        # 深度更新逻辑
        for section, values in new_config.items():
            if section in self.config and isinstance(values, dict):
                self.config[section].update(values)
            else:
                self.config[section] = values
        self.save_config()

    def get(self, section: str, key: str, default=None):
        return self.config.get(section, {}).get(key, default)

def get_config_service():
    return ConfigService()
