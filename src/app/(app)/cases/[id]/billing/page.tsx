"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function CaseBillingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/cases/${id}?tab=billing`); }, [id, router]);
  return null;
}
