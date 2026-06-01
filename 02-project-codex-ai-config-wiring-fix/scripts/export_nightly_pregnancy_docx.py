from __future__ import annotations

import html
import re
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MD = ROOT / "docs" / "nightly-pregnancy-architecture.md"
TARGET_DOCX = ROOT / "game word" / "侍寝与怀孕硬规则.docx"

W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'


def xml_escape(text: str) -> str:
    return html.escape(text, quote=False)


def run_xml(text: str, *, bold: bool = False, size: int = 24) -> str:
    text = xml_escape(text)
    props = [
        '<w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:cs="宋体"/>',
        '<w:kern w:val="0"/>',
        f'<w:sz w:val="{size}"/>',
        f'<w:szCs w:val="{size}"/>',
        '<w:lang w:val="en-US" w:eastAsia="zh-CN" w:bidi="ar"/>',
    ]
    if bold:
        props.insert(1, "<w:b/>")
    return (
        "<w:r>"
        f"<w:rPr>{''.join(props)}</w:rPr>"
        f"<w:t xml:space=\"preserve\">{text}</w:t>"
        "</w:r>"
    )


def paragraph_xml(text: str, *, bold: bool = False, size: int = 24) -> str:
    if not text:
        return (
            '<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines w:val="0"/>'
            '<w:widowControl/><w:suppressLineNumbers w:val="0"/><w:jc w:val="left"/>'
            '</w:pPr></w:p>'
        )

    return (
        "<w:p>"
        "<w:pPr>"
        '<w:keepNext w:val="0"/>'
        '<w:keepLines w:val="0"/>'
        "<w:widowControl/>"
        '<w:suppressLineNumbers w:val="0"/>'
        '<w:jc w:val="left"/>'
        "</w:pPr>"
        f"{run_xml(text, bold=bold, size=size)}"
        "</w:p>"
    )


def heading_size(level: int) -> int:
    return {1: 36, 2: 30, 3: 26, 4: 24}.get(level, 24)


def normalize_line(line: str) -> str:
    line = line.rstrip()
    line = re.sub(r"`([^`]+)`", r"\1", line)
    line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
    line = re.sub(r"\*([^*]+)\*", r"\1", line)
    line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
    return line.strip()


def markdown_to_paragraphs(markdown_text: str) -> list[str]:
    paragraphs: list[str] = []
    for raw_line in markdown_text.splitlines():
        line = normalize_line(raw_line)
        if not line:
            paragraphs.append(paragraph_xml(""))
            continue

        heading_match = re.match(r"^(#{1,4})\s+(.*)$", line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            paragraphs.append(paragraph_xml(text, bold=True, size=heading_size(level)))
            continue

        ordered_match = re.match(r"^(\d+)\.\s+(.*)$", line)
        if ordered_match:
            text = f"{ordered_match.group(1)}. {ordered_match.group(2).strip()}"
            paragraphs.append(paragraph_xml(text))
            continue

        bullet_match = re.match(r"^-\s+(.*)$", line)
        if bullet_match:
            text = f"• {bullet_match.group(1).strip()}"
            paragraphs.append(paragraph_xml(text))
            continue

        paragraphs.append(paragraph_xml(line))

    while paragraphs and paragraphs[-1] == paragraph_xml(""):
        paragraphs.pop()
    return paragraphs


def build_document_xml(markdown_text: str) -> str:
    body = "".join(markdown_to_paragraphs(markdown_text))
    sect = (
        "<w:sectPr>"
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" '
        'w:header="851" w:footer="992" w:gutter="0"/>'
        '<w:cols w:space="425" w:num="1"/>'
        '<w:docGrid w:type="lines" w:linePitch="312" w:charSpace="0"/>'
        "</w:sectPr>"
    )
    return (
        XML_DECL
        + 
        f'<w:document xmlns:w="{W_NAMESPACE}"><w:body>{body}{sect}</w:body></w:document>'
    )


def export_docx() -> None:
    markdown_text = SOURCE_MD.read_text(encoding="utf-8")
    document_xml = build_document_xml(markdown_text)

    tmp_output = TARGET_DOCX.with_suffix(".tmp.docx")
    with zipfile.ZipFile(TARGET_DOCX, "r") as src_zip, zipfile.ZipFile(
        tmp_output, "w", compression=zipfile.ZIP_DEFLATED
    ) as dst_zip:
        for info in src_zip.infolist():
            data = src_zip.read(info.filename)
            if info.filename == "word/document.xml":
                data = document_xml.encode("utf-8")
            dst_zip.writestr(info, data)

    tmp_output.replace(TARGET_DOCX)


if __name__ == "__main__":
    try:
        export_docx()
    except Exception as exc:  # pragma: no cover
        print(f"export failed: {exc}", file=sys.stderr)
        raise
