"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function CaseTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/cases/${id}?tab=timeline`); }, [id, router]);
  return null;
}
