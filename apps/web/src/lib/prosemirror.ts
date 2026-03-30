/**
 * Convert markdown to Substack ProseMirror JSON format
 *
 * ProseMirror is a structured document format used by Substack.
 * This converter handles common markdown patterns.
 */

interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ProseMirrorNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

interface ProseMirrorDoc {
  type: "doc";
  content: ProseMirrorNode[];
}

/**
 * Parse inline markdown (bold, italic, links) into ProseMirror marks
 */
function parseInlineMarks(text: string): ProseMirrorNode[] {
  const nodes: ProseMirrorNode[] = [];
  let currentText = "";
  let i = 0;

  const flushText = () => {
    if (currentText) {
      nodes.push({ type: "text", text: currentText });
      currentText = "";
    }
  };

  while (i < text.length) {
    // Bold: **text** or __text__
    if (
      (text[i] === "*" && text[i + 1] === "*") ||
      (text[i] === "_" && text[i + 1] === "_")
    ) {
      const delimiter = text[i];
      const endPattern = delimiter + delimiter;
      const endIndex = text.indexOf(endPattern, i + 2);

      if (endIndex !== -1) {
        flushText();
        const boldText = text.slice(i + 2, endIndex);
        nodes.push({
          type: "text",
          text: boldText,
          marks: [{ type: "strong" }],
        });
        i = endIndex + 2;
        continue;
      }
    }

    // Italic: *text* or _text_
    if (text[i] === "*" || text[i] === "_") {
      const delimiter = text[i];
      const endIndex = text.indexOf(delimiter, i + 1);

      if (endIndex !== -1 && text[endIndex - 1] !== "\\") {
        flushText();
        const italicText = text.slice(i + 1, endIndex);
        nodes.push({
          type: "text",
          text: italicText,
          marks: [{ type: "em" }],
        });
        i = endIndex + 1;
        continue;
      }
    }

    // Links: [text](url)
    if (text[i] === "[") {
      const textEnd = text.indexOf("]", i);
      if (textEnd !== -1 && text[textEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", textEnd + 2);
        if (urlEnd !== -1) {
          flushText();
          const linkText = text.slice(i + 1, textEnd);
          const url = text.slice(textEnd + 2, urlEnd);
          nodes.push({
            type: "text",
            text: linkText,
            marks: [{ type: "link", attrs: { href: url } }],
          });
          i = urlEnd + 1;
          continue;
        }
      }
    }

    currentText += text[i];
    i++;
  }

  flushText();
  return nodes;
}

/**
 * Convert markdown line to ProseMirror node
 */
function parseMarkdownLine(line: string): ProseMirrorNode | null {
  // Empty line
  if (!line.trim()) {
    return null;
  }

  // Heading: # ## ### etc.
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const text = headingMatch[2];
    return {
      type: "heading",
      attrs: { level },
      content: parseInlineMarks(text),
    };
  }

  // Code block start (will be handled by block parser)
  if (line.trim().startsWith("```")) {
    return null;
  }

  // Unordered list: - or * or +
  const unorderedListMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
  if (unorderedListMatch) {
    return {
      type: "bullet_list",
      content: [
        {
          type: "list_item",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarks(unorderedListMatch[1]),
            },
          ],
        },
      ],
    };
  }

  // Ordered list: 1. 2. etc.
  const orderedListMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
  if (orderedListMatch) {
    return {
      type: "ordered_list",
      content: [
        {
          type: "list_item",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarks(orderedListMatch[1]),
            },
          ],
        },
      ],
    };
  }

  // Image: ![alt](url)
  const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    return {
      type: "image",
      attrs: {
        src: imageMatch[2],
        alt: imageMatch[1] || null,
      },
    };
  }

  // Regular paragraph
  return {
    type: "paragraph",
    content: parseInlineMarks(line),
  };
}

/**
 * Convert markdown to ProseMirror document
 */
export function markdownToProseMirror(markdown: string): ProseMirrorDoc {
  const lines = markdown.split("\n");
  const nodes: ProseMirrorNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block: ```
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }

      if (codeLines.length > 0) {
        nodes.push({
          type: "code_block",
          attrs: language ? { language } : {},
          content: [{ type: "text", text: codeLines.join("\n") }],
        });
      }
      i++; // Skip closing ```
      continue;
    }

    const node = parseMarkdownLine(line);
    if (node) {
      // Merge consecutive list items
      const lastNode = nodes[nodes.length - 1];
      if (
        lastNode &&
        node.type === lastNode.type &&
        (node.type === "bullet_list" || node.type === "ordered_list")
      ) {
        lastNode.content = lastNode.content || [];
        if (node.content && node.content[0]) {
          lastNode.content.push(node.content[0]);
        }
      } else {
        nodes.push(node);
      }
    }

    i++;
  }

  // Ensure document has at least one paragraph
  if (nodes.length === 0) {
    nodes.push({
      type: "paragraph",
      content: [{ type: "text", text: "" }],
    });
  }

  return {
    type: "doc",
    content: nodes,
  };
}

/**
 * Validate that ProseMirror document is well-formed
 */
export function validateProseMirrorDoc(doc: ProseMirrorDoc): boolean {
  if (doc.type !== "doc") return false;
  if (!Array.isArray(doc.content)) return false;
  if (doc.content.length === 0) return false;
  return true;
}
