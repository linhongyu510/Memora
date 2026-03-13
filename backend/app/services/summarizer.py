"""
LLM 摘要与打标 - 调用 DeepSeek/OpenAI 生成结构化输出
# 需要: pip install openai
"""
import json
import re
from typing import List, Optional
from sqlalchemy.orm import Session
from app.schemas.pipeline import LLMResult
from app.core.config import get_settings
from app.services.system_config import get_llm_settings


# 默认候选标签树（可从数据库加载，此处写死便于演示）
DEFAULT_TAG_TREE = [
    "工作",
    "学习",
    "生活",
    "技术",
    "读书",
    "会议",
    "灵感",
    "待办",
    "归档",
]


SYSTEM_PROMPT = """你是一位专业的个人知识库助手。你的任务是根据用户提供的「原始文本内容」，提炼出结构化的笔记元数据。

## 输出要求（必须严格遵守）

你必须返回 **仅包含以下字段的 JSON 对象**，不要输出任何其他文字、 markdown 代码块标记或解释：

```json
{{
  "title": "提炼后的简洁标题，不超过 30 字",
  "summary": "2-5 句话的核心摘要，概括要点与关键信息",
  "suggested_tags": ["标签1", "标签2", "标签3"],
  "category": "建议的一级分类名称，或空字符串"
}}
```

## 规则

1. **title**：从内容中提取或概括，简洁有力，便于快速识别笔记主题。
2. **summary**：用中文撰写，抓住核心要点，避免照抄原文。
3. **suggested_tags**：从下方「候选标签」中优先选择 1-3 个最相关的；若没有合适的，可自创 1-2 个新标签，但需简洁（2-6 字）。
4. **category**：从候选标签或常见分类中选一个，如工作/学习/生活/技术等；若无法判断，置为空字符串 `""`。

## 候选标签

{candidate_tags}

## 注意事项

- 只输出上述 JSON，不要包含 ```json 或 ``` 等 Markdown 标记。
- 确保 JSON 合法，可被 `json.loads` 解析。
- 若原文为空或无法理解，仍返回合法 JSON，title 和 summary 可写「（无法识别）」。
"""


async def summarize(
    raw_text: str,
    candidate_tags: Optional[List[str]] = None,
    db: Session | None = None,
) -> LLMResult:
    """
    调用 LLM 对 raw_text 进行摘要与打标，返回 LLMResult

    Args:
        raw_text: 解析器提取的原始文本
        candidate_tags: 候选标签列表，不传则用默认

    Returns:
        LLMResult
    """
    tags = candidate_tags or DEFAULT_TAG_TREE
    tags_str = "、".join(tags)
    system = SYSTEM_PROMPT.format(candidate_tags=tags_str)

    # 截断过长文本，避免超 token
    max_chars = 8000
    text_to_send = raw_text[:max_chars] + ("..." if len(raw_text) > max_chars else "")

    user_content = f"""请对以下内容进行摘要与打标：

---
{text_to_send}
---
"""

    settings = get_settings()
    db_settings = get_llm_settings(db) if db is not None else {
        "llm_api_key": None,
        "llm_api_base": None,
        "llm_model": None,
    }

    api_key = db_settings["llm_api_key"] or settings.LLM_API_KEY
    api_base = db_settings["llm_api_base"] or settings.LLM_API_BASE
    model = db_settings["llm_model"] or settings.LLM_MODEL

    if not api_key:
        return _mock_summarize(raw_text)

    try:
        from openai import AsyncOpenAI

        base_url = api_base or (
            "https://api.deepseek.com" if "deepseek" in model.lower() else None
        )
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
        )
        content = response.choices[0].message.content
        return _parse_llm_response(content, raw_text)

    except Exception as e:
        return _mock_summarize(raw_text, error=str(e))


def _parse_llm_response(content: str, raw_text: str) -> LLMResult:
    """解析 LLM 返回的文本为 LLMResult"""
    content = content.strip()
    # 去除可能的 markdown 代码块
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    try:
        data = json.loads(content)
        return LLMResult(
            title=data.get("title", "未命名笔记"),
            summary=data.get("summary", ""),
            suggested_tags=data.get("suggested_tags", []),
            category=data.get("category", ""),
        )
    except json.JSONDecodeError:
        return _mock_summarize(raw_text, error=f"LLM 返回非 JSON: {content[:200]}")


def _mock_summarize(raw_text: str, error: Optional[str] = None) -> LLMResult:
    """无 API Key 或调用失败时的 mock 结果"""
    preview = (raw_text[:80] + "...") if len(raw_text) > 80 else raw_text
    return LLMResult(
        title="（Mock）待完善标题",
        summary=f"原始内容预览: {preview}" + (f"。错误: {error}" if error else ""),
        suggested_tags=["待整理"],
        category="",
    )
