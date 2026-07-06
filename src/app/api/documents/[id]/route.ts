import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, Number(id)), eq(documents.userId, user.id)),
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const data = await readFile(doc.storedKey, doc.storage as "local" | "s3");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    },
  });
}
