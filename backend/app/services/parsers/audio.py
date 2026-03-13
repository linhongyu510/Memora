"""
音视频解析器 - FFmpeg 抽音 + Whisper 转写
# 需要: pip install openai-whisper  (或调用 Whisper API)
# 系统需安装: ffmpeg (音视频抽帧)
"""
import io
import tempfile
import subprocess
from pathlib import Path
from app.schemas.pipeline import ParsedContent, MediaType
from .base import BaseParser


class AudioParser(BaseParser):
    """
    处理音频 (.mp3, .wav, .m4a) 和视频 (.mp4, .webm)
    流程: 视频 -> FFmpeg 抽音 -> 音频 -> Whisper 转写 -> 文本
    """

    @property
    def media_type(self) -> MediaType:
        return MediaType.AUDIO  # 视频也走此 parser，输出为转写文本

    def _ffmpeg_extract_audio(self, input_path: Path, output_path: Path) -> bool:
        """
        使用 FFmpeg 从视频中抽取音频为 wav
        ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav
        """
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-i", str(input_path),
                    "-vn",  # 不处理视频
                    "-acodec", "pcm_s16le",
                    "-ar", "16000",  # Whisper 推荐采样率
                    "-y",  # 覆盖输出
                    str(output_path),
                ],
                check=True,
                capture_output=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            raise ValueError(f"FFmpeg 抽取音频失败: {e}") from e

    def _whisper_transcribe(self, audio_path: Path) -> str:
        """
        调用 Whisper 转写音频
        生产: whisper.load_model("base"); model.transcribe(str(audio_path))
        当前: mock 返回值
        """
        try:
            import whisper
            model = whisper.load_model("base")  # 需下载，可改为 tiny 加速
            result = model.transcribe(str(audio_path), language="zh")
            return result["text"].strip()
        except ImportError:
            return f"[Whisper Mock] 音频已接收，路径: {audio_path}。请安装: pip install openai-whisper"
        except Exception as e:
            return f"[Whisper 转写异常] {e}"

    async def extract(self, file_bytes: bytes, filename: str) -> ParsedContent:
        lower = filename.lower()
        is_video = any(lower.endswith(ext) for ext in (".mp4", ".webm", ".mkv", ".avi", ".mov"))

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp = Path(tmpdir)
                if is_video:
                    video_path = tmp / ("input_video" + Path(filename).suffix)
                    video_path.write_bytes(file_bytes)
                    audio_path = tmp / "audio.wav"
                    self._ffmpeg_extract_audio(video_path, audio_path)
                else:
                    audio_path = tmp / ("input_audio" + Path(filename).suffix)
                    audio_path.write_bytes(file_bytes)

                raw_text = self._whisper_transcribe(audio_path)

            return ParsedContent(
                raw_text=raw_text or "(未识别到语音内容)",
                media_type=MediaType.VIDEO if is_video else MediaType.AUDIO,
                filename=filename,
            )
        except Exception as e:
            # FFmpeg/Whisper 不可用时的 mock 兜底
            return ParsedContent(
                raw_text=f"[音视频 Mock] 文件: {filename}。需安装 ffmpeg 与 openai-whisper。错误: {e}",
                media_type=MediaType.VIDEO if is_video else MediaType.AUDIO,
                filename=filename,
            )
