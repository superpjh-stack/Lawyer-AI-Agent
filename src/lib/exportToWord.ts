import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from "docx";
import { saveAs } from "file-saver";

/** 마크다운 텍스트를 Word 문서로 내보내기 */
export async function exportToWord(content: string, title: string) {
  const lines = content.split("\n");
  const children: Paragraph[] = [];

  // ── 표지 ─────────────────────────────────────────────────
  children.push(
    new Paragraph({
      text: "법 률 자 문 서",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 240 },
    })
  );

  children.push(
    new Paragraph({
      text: title,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: title,
          size: 28,
          bold: true,
          color: "1E3A5F",
        }),
      ],
    })
  );

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 720 },
      children: [
        new TextRun({
          text: today,
          size: 22,
          color: "666666",
        }),
      ],
    })
  );

  // 구분선
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E3A5F" },
      },
      spacing: { after: 480 },
      text: "",
    })
  );

  // ── 본문 파싱 ─────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H1
    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#\s*/, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        })
      );
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^##\s*/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 180 },
        })
      );
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^###\s*/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // 구분선
    if (line.trim() === "---") {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
          },
          spacing: { before: 240, after: 240 },
          text: "",
        })
      );
      continue;
    }

    // 불릿 리스트
    if (line.trim().startsWith("- ")) {
      const text = line.trim().replace(/^-\s*/, "");
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
          children: parseInline(text),
        })
      );
      continue;
    }

    // 번호 리스트
    if (/^\d+\.\s/.test(line.trim())) {
      const text = line.trim().replace(/^\d+\.\s*/, "");
      children.push(
        new Paragraph({
          numbering: { reference: "numbering", level: 0 },
          spacing: { before: 60, after: 60 },
          children: parseInline(text),
        })
      );
      continue;
    }

    // 빈 줄
    if (line.trim() === "") {
      children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    // 일반 텍스트
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: parseInline(line),
      })
    );
  }

  // ── 하단 면책 문구 ─────────────────────────────────────────
  children.push(
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      },
      spacing: { before: 720, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "본 자문서는 AI가 생성한 초안입니다. 실제 법률 효력을 위해 담당 변호사의 최종 검토가 필요합니다.",
          size: 16,
          color: "999999",
          italics: true,
        }),
      ],
    })
  );

  // ── 문서 생성 ────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "맑은 고딕", size: 22 },
          paragraph: { spacing: { line: 360 } },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          run: { bold: true, size: 32, color: "1E3A5F" },
          paragraph: { spacing: { before: 480, after: 240 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          run: { bold: true, size: 26, color: "1E3A5F" },
          paragraph: { spacing: { before: 360, after: 180 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          run: { bold: true, size: 23, color: "2D5A9E" },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1800,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50);
  saveAs(blob, `자문서_${safeTitle}_${new Date().toISOString().slice(0, 10)}.docx`);
}

/** 인라인 마크다운 파싱 (볼드, 이탤릭) */
function parseInline(text: string): TextRun[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return new TextRun({ text: part.slice(1, -1), italics: true });
    }
    return new TextRun({ text: part });
  });
}
