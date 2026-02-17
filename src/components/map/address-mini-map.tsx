"use client";

export default function AddressMiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <iframe
      src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&t=m`}
      className="h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen={false}
    />
  );
}
