// app/dashboard/client/events/[eventId]/gallery/page.tsx

import ClientGalleryPage from './ClientGalleryPage';

type PageProps = {
  params: Promise<{ eventId: string }>;  // <-- Note o Promise aqui
};

export default async function Page({ params }: PageProps) {
  const { eventId } = await params;  // <-- Await obrigatório

  return <ClientGalleryPage eventId={eventId} />;
}