"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function CaseDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/cases/${id}?tab=documents`); }, [id, router]);
  return null;
}
