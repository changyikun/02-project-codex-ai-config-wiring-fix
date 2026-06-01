from __future__ import annotations

from export_nightly_pregnancy_docx import export_docx
from sync_game_architecture_docx import sync_docx


def main() -> None:
    export_docx()
    sync_docx()


if __name__ == "__main__":
    main()
