'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { OrganizationTable } from '@/components/Organization/OrganizationTable';
import { useOrganizationList, useOrganizationMutations } from '@/hooks/useOrganization';

export default function OrganizationListPage() {
  const [search, setSearch] = useState('');
  const { items, pagination, isLoading, refetch } = useOrganizationList({ search });
  const { deleteItem } = useOrganizationMutations();

  const handleDelete = async (id: string) => {
    if (confirm('Delete this organization?')) {
      await deleteItem(id);
      refetch();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Management</h1>
          <p className="text-muted-foreground">Manage organization records</p>
        </div>
        <Link href="/organizations/new"><Button><Plus className="w-4 h-4 mr-2" />Add Organization</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center">Loading...</div> : (
            <OrganizationTable data={items || []} onView={(id) => location.href=`/organizations/${id}`} onEdit={(id) => location.href=`/organizations/${id}/edit`} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}