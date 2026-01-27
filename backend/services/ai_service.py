import os
import httpx
import json
from typing import List, Dict, Any

class AIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        self.model = "qwen-plus"

    async def chat(self, messages: List[Dict[str, str]], stats_context: Dict[str, Any]) -> str:
        """
        进行多轮对话，并注入统计数据上下文
        """
        from .config_service import get_config_service
        config = get_config_service().get_config()
        ai_config = config.get("ai", {})
        current_model = ai_config.get("model", self.model)
        custom_prompt = ai_config.get("system_prompt", "")

        print(f">>> 开始 AI 对话请求: 历史消息数={len(messages)}, 模型={current_model}")
        system_prompt = """你是一位专业的智慧食堂经营分析专家。
你可以通过分析食堂的剩菜数据（如浪费率、走势、热门菜品等）提供经营建议。

**关键背景数据（请以此为分析基础）：**
{stats_summary}

**你的行为准则：**
1. **数据驱动**：优先参考上述背景数据回答问题。
2. **交互性**：采用对话风格，简洁明了。问答要具有针对性。
3. **专业性**：给出具体的、可操作的建议（如：菜品配比、口味调整、备餐量控制）。
4. **Markdown 格式**：使用 Markdown 提炼重点。

目前的北京时间是：{current_time}。
现在的对话是基于上述背景展开的。请直接回答用户的问题，不要重复背景数据，除非是为了佐证你的意见。"""

        from datetime import datetime
        stats_summary = self._build_user_prompt(stats_context)
        
        full_messages = [
            {"role": "system", "content": system_prompt.format(
                stats_summary=stats_summary,
                current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )}
        ] + messages

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": current_model,
            "messages": full_messages,
            "temperature": 0.8,
            "top_p": 0.8
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                print(f">>> 正在发送 API 请求到: {current_model}")
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                reply = result["choices"][0]["message"]["content"]
                print(">>> AI 响应获取成功")
                return reply
        except httpx.ConnectTimeout:
            print("❌ AI API 连接超时")
            return "连接 AI 服务超时，请检查您的网络能否访问阿里云 API 服务。"
        except Exception as e:
            print(f"❌ AI 对话异常: {str(e)}")
            return f"AI 对话暂时无法提供服务 (错误: {str(e)})"

    def _build_user_prompt(self, stats: Dict[str, Any]) -> str:
        """
        将统计数据转化为 AI 可理解的文本
        """
        trends = stats.get("trends", {})
        top_waste = stats.get("top_waste", [])
        
        prompt = "以下是过去 7 天的统计数据：\n\n"
        
        # 趋势数据
        prompt += "### 1. 浪费率趋势 (过去7天)\n"
        waste_trend = trends.get("waste", [])
        prompt += f"每日平均浪费率: {', '.join([f'{w}%' for w in waste_trend])}\n\n"
        
        # 菜品表现
        prompt += "### 2. 菜品表现 (平均浪费率)\n"
        for item in top_waste:
            prompt += f"- **{item['food_name']}**: 平均浪费率 {item['average_waste_rate']}% (采样次数: {item['sample_count']})\n"
        
        prompt += "\n请根据以上数据进行分析并给出改进建议。"
        return prompt

# 单例模式
_ai_service = None

def get_ai_service():
    global _ai_service
    if _ai_service is None:
        from .config_service import get_config_service
        config = get_config_service().get_config()
        
        # 优先使用配置中的 Key，否则使用默认
        config_key = config.get("ai", {}).get("api_key", "")
        api_key = config_key if config_key else "sk-6946f8148ef84f95afeb03ae7a4aa0b1"
        
        _ai_service = AIService(api_key)
    return _ai_service
