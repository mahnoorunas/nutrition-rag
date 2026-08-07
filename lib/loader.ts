import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";

export async function loadDocument() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "Understanding_Everyday_Nutrition.docx"
  );

  const buffer = await fs.readFile(filePath);

  const result = await mammoth.extractRawText({
    buffer,
  });

  return result.value;
}