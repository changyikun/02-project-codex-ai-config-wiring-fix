from __future__ import annotations

import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from export_nightly_pregnancy_docx import ROOT, SOURCE_MD, paragraph_xml


GAME_WORD_DIR = ROOT / "game word"
W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NAMESPACE}
TOP_HEADING_RE = re.compile(r"^([一二三四五六七八九十百零]+)、(.+)$")
MODULE_HEADING_RE = re.compile(r"(侍寝|怀孕|陪伴)")
ET.register_namespace("w", W_NAMESPACE)


def find_architecture_docx() -> Path:
    preferred = GAME_WORD_DIR / "游戏架构目录.docx"
    if preferred.exists():
        return preferred

    matches = sorted(
        p
        for p in GAME_WORD_DIR.glob("*游戏架构目录*.docx")
        if not p.name.endswith(".tmp.docx")
    )
    if not matches:
        raise FileNotFoundError("未找到游戏架构目录 Word 文件")
    return matches[0]


def strip_heading_prefix(text: str) -> str:
    if "、" in text:
        return text.split("、", 1)[1].strip()
    match = re.match(r"^\d+(?:\.\d+)*\s+(.+)$", text)
    if match:
        return match.group(1).strip()
    return text.strip()


def normalize_markdown_line(line: str) -> str:
    line = line.rstrip()
    line = re.sub(r"`([^`]+)`", r"\1", line)
    line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
    line = re.sub(r"\*([^*]+)\*", r"\1", line)
    line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
    return line.strip()


def chinese_to_int(text: str) -> int:
    digits = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    if text == "十":
        return 10
    if "十" not in text:
        return digits[text]
    if text.startswith("十"):
        return 10 + digits.get(text[1:], 0)
    if text.endswith("十"):
        return digits[text[0]] * 10
    left, right = text.split("十", 1)
    return digits[left] * 10 + digits[right]


def int_to_chinese(value: int) -> str:
    digits = "零一二三四五六七八九"
    if value <= 10:
        return "十" if value == 10 else digits[value]
    tens, ones = divmod(value, 10)
    if value < 20:
        return f"十{digits[ones]}" if ones else "十"
    if ones == 0:
        return f"{digits[tens]}十"
    return f"{digits[tens]}十{digits[ones]}"


def get_paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()


def parse_paragraph_fragment(xml_fragment: str) -> ET.Element:
    wrapper = ET.fromstring(f'<root xmlns:w="{W_NAMESPACE}">{xml_fragment}</root>')
    paragraph = wrapper.find("w:p", NS)
    if paragraph is None:
        raise ValueError("无法解析段落片段")
    return paragraph


def build_module_section(top_index: int) -> list[str]:
    markdown_text = SOURCE_MD.read_text(encoding="utf-8")
    paragraphs: list[str] = [paragraph_xml(f"{int_to_chinese(top_index)}、侍寝与怀孕模块统一架构", bold=True, size=30)]

    level2 = 0
    level3 = 0
    level4 = 0

    for raw_line in markdown_text.splitlines():
        line = normalize_markdown_line(raw_line)
        if not line:
            paragraphs.append(paragraph_xml(""))
            continue

        if line.startswith("# "):
            continue

        if line.startswith("## "):
            level2 += 1
            level3 = 0
            level4 = 0
            text = strip_heading_prefix(line[3:].strip())
            paragraphs.append(paragraph_xml(f"{top_index}.{level2} {text}", bold=True, size=26))
            continue

        if line.startswith("### "):
            level3 += 1
            level4 = 0
            text = strip_heading_prefix(line[4:].strip())
            paragraphs.append(paragraph_xml(f"{top_index}.{level2}.{level3} {text}", bold=True, size=24))
            continue

        if line.startswith("#### "):
            level4 += 1
            text = strip_heading_prefix(line[5:].strip())
            paragraphs.append(paragraph_xml(f"{top_index}.{level2}.{level3}.{level4} {text}", bold=True, size=24))
            continue

        ordered = re.match(r"^(\d+)\.\s+(.*)$", line)
        if ordered:
            paragraphs.append(paragraph_xml(f"{ordered.group(1)}. {ordered.group(2).strip()}"))
            continue

        bullet = re.match(r"^-\s+(.*)$", line)
        if bullet:
            paragraphs.append(paragraph_xml(f"• {bullet.group(1).strip()}"))
            continue

        paragraphs.append(paragraph_xml(line))

    while paragraphs and paragraphs[-1] == paragraph_xml(""):
        paragraphs.pop()
    return paragraphs


def locate_module_range(body_children: list[ET.Element]) -> tuple[int | None, int | None, int]:
    top_numbers: list[int] = []
    start_idx: int | None = None
    end_idx: int | None = None

    for idx, child in enumerate(body_children):
        if child.tag != f"{{{W_NAMESPACE}}}p":
            continue
        text = get_paragraph_text(child)
        top_match = TOP_HEADING_RE.match(text)
        if top_match:
            top_numbers.append(chinese_to_int(top_match.group(1)))
            if MODULE_HEADING_RE.search(top_match.group(2)):
                start_idx = idx
                for next_idx in range(idx + 1, len(body_children)):
                    next_child = body_children[next_idx]
                    if next_child.tag != f"{{{W_NAMESPACE}}}p":
                        continue
                    next_text = get_paragraph_text(next_child)
                    if TOP_HEADING_RE.match(next_text):
                        end_idx = next_idx
                        break
                break

    if start_idx is not None:
        current_heading = get_paragraph_text(body_children[start_idx])
        heading_match = TOP_HEADING_RE.match(current_heading)
        if not heading_match:
            raise ValueError("无法解析现有模块标题编号")
        return start_idx, end_idx or len(body_children), chinese_to_int(heading_match.group(1))

    next_top = (max(top_numbers) + 1) if top_numbers else 1
    return None, None, next_top


def sync_docx() -> Path:
    target_docx = find_architecture_docx()

    with zipfile.ZipFile(target_docx, "r") as src_zip:
        xml_bytes = src_zip.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    body = root.find("w:body", NS)
    if body is None:
        raise ValueError("Word 文档缺少 body 节点")

    body_children = list(body)
    start_idx, end_idx, top_index = locate_module_range(body_children)
    new_elements = [parse_paragraph_fragment(xml) for xml in build_module_section(top_index)]

    sect_pr = body.find("w:sectPr", NS)
    if start_idx is not None and end_idx is not None:
        for idx in range(end_idx - 1, start_idx - 1, -1):
            body.remove(body_children[idx])
        insert_at = start_idx
    else:
        insert_at = len(body_children) - (1 if sect_pr is not None else 0)

    for offset, element in enumerate(new_elements):
        body.insert(insert_at + offset, element)

    updated_xml = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    tmp_output = target_docx.with_suffix(".tmp.docx")
    with zipfile.ZipFile(target_docx, "r") as src_zip, zipfile.ZipFile(
        tmp_output, "w", compression=zipfile.ZIP_DEFLATED
    ) as dst_zip:
        for info in src_zip.infolist():
            data = src_zip.read(info.filename)
            if info.filename == "word/document.xml":
                data = updated_xml
            dst_zip.writestr(info, data)

    tmp_output.replace(target_docx)
    return target_docx


if __name__ == "__main__":
    sync_docx()
