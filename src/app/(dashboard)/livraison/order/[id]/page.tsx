"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/track/${id}`);
  }, [id, router]);

  return null;
}
