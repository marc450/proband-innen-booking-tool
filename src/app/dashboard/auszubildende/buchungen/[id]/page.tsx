import { isAdmin as checkIsAdmin } from "@/lib/auth";
import { BookingDetail } from "./booking-detail";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isAdmin = await checkIsAdmin();
  return <BookingDetail bookingId={id} isAdmin={isAdmin} />;
}
