import { redirect } from 'next/navigation';

interface AddressRootPageProps {
  params: Promise<{ address: string }>;
}

export default async function AddressRootPage({ params }: AddressRootPageProps) {
  const { address } = await params;
  redirect(`/${encodeURIComponent(address)}/trades`);
}
