"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function CaseDeadlinesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/cases/${id}?tab=deadlines`); }, [id, router]);
  return null;
}
