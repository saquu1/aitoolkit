'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { OrganizationForm } from '@/components/Organization/OrganizationForm';
import { useOrganizationItem, useOrganizationMutations } from '@/hooks/useOrganization';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { item, isLoading } = useOrganizationItem(id);
  const { updateItem } = useOrganizationMutations();

  const handleSubmit = async (data: any) => {
    await updateItem({ id, ...data });
    router.push('/organizations');
  };

  if (isLoading) return <div className="container mx-auto py-6">Loading...</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" onClick={() => router.push('/organizations')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      <Card>
        <CardHeader><CardTitle>Edit Organization</CardTitle></CardHeader>
        <CardContent><OrganizationForm initialData={item} onSubmit={handleSubmit} isEditing /></CardContent>
      </Card>
    </div>
  );
}