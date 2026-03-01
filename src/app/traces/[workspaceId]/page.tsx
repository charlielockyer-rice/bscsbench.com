import { redirect } from "next/navigation";

export default async function TracePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/work/${workspaceId}`);
}
