"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function CaseOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/cases/${id}`); }, [id, router]);
  return null;
}
