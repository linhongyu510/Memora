"""
PDF / Word 文档解析器
# 需要: pip install pymupdf python-docx
"""
import io
from app.schemas.pipeline import ParsedContent, MediaType
from app.services.paddle_ocr import PaddleOCRUnavailableError, extract_text_from_image_bytes
from .base import BaseParser


class DocumentParser(BaseParser):
    """处理 PDF、Word 文档"""

    @property
    def media_type(self) -> MediaType:
        return MediaType.DOCUMENT

    def _extract_pdf(self, file_bytes: bytes) -> str:
        """使用 PyMuPDF (fitz) 提取 PDF 文本"""
        try:
            import fitz  # pymupdf
        except ImportError:
            raise ValueError("请安装 pymupdf: pip install pymupdf")

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        texts = []
        try:
            for page in doc:
                texts.append(page.get_text())
        finally:
            doc.close()

        return "\n\n".join(texts).strip()

    def _extract_pdf_with_ocr(self, file_bytes: bytes) -> str:
        """
        对扫描版 PDF 做 OCR：逐页渲染为图片后再交给 PaddleOCR。
        """
        try:
            import fitz  # pymupdf
        except ImportError as exc:
            raise ValueError("请安装 pymupdf: pip install pymupdf") from exc

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        texts: list[str] = []
        try:
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                image_bytes = pix.tobytes("png")
                text = extract_text_from_image_bytes(image_bytes)
                if text.strip():
                    texts.append(text.strip())
        finally:
            doc.close()

        return "\n\n".join(texts).strip()

    def _extract_docx(self, file_bytes: bytes) -> str:
        """使用 python-docx 提取 Word 文本"""
        try:
            from docx import Document
        except ImportError:
            raise ValueError("请安装 python-docx: pip install python-docx")

        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs]
        return "\n\n".join(paragraphs).strip()

    async def extract(self, file_bytes: bytes, filename: str) -> ParsedContent:
        lower = filename.lower()
        if lower.endswith(".pdf"):
            raw_text = self._extract_pdf(file_bytes)
            # 若提取不到文本，认为可能是扫描版 PDF，尝试 OCR
            if not raw_text.strip():
                try:
                    raw_text = self._extract_pdf_with_ocr(file_bytes)
                except PaddleOCRUnavailableError:
                    raw_text = ""
        elif lower.endswith(".docx"):
            raw_text = self._extract_docx(file_bytes)
        else:
            raise ValueError(f"不支持的文档格式: {filename}")

        return ParsedContent(
            raw_text=raw_text or "(未提取到文本内容)",
            media_type=self.media_type,
            filename=filename,
        )
