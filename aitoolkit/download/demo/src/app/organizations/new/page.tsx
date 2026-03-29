'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationForm } from '@/components/Organization/OrganizationForm';
import { useOrganizationMutations } from '@/hooks/useOrganization';

export default function NewOrganizationPage() {
  const router = useRouter();
  const { createItem } = useOrganizationMutations();

  const handleSubmit = async (data: any) => {
    await createItem(data);
    router.push('/organizations');
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader><CardTitle>Create Organization</CardTitle></CardHeader>
        <CardContent><OrganizationForm onSubmit={handleSubmit} /></CardContent>
      </Card>
    </div>
  );
}