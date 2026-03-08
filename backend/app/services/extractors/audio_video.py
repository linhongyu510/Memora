"""
音视频提取器（Mock）。
"""

from pathlib import Path


def extract_from_audio_or_video(file_path: Path, mime_type: str) -> str:
    """
    模拟 Whisper 对音视频进行转写。
    """
    return (
        f"[Mock Whisper] 已完成转写\n"
        f"- 文件名: {file_path.name}\n"
        f"- MIME: {mime_type}\n"
        f"- 结果: 这是一段模拟的音视频转写文本，用于打通后端处理流水线。"
    )

