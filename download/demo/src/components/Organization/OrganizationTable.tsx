'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2 } from 'lucide-react';

interface OrganizationTableProps {
  data: any[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function OrganizationTable({ data, onView, onEdit, onDelete }: OrganizationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Organization Type Id</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Is Active</TableHead>
          <TableHead>U A N</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              No organizations found
            </TableCell>
          </TableRow>
        ) : (
          data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name || '-'}</TableCell>
              <TableCell>{item.organizationTypeId || '-'}</TableCell>
              <TableCell>{item.email || '-'}</TableCell>
              <TableCell>{item.isActive || '-'}</TableCell>
              <TableCell>{item.uAN || '-'}</TableCell>
              <TableCell>
                <Badge variant={item.isActive ? 'default' : 'secondary'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onView && <Button variant="ghost" size="icon" onClick={() => onView(item.id)}><Eye className="h-4 w-4" /></Button>}
                  {onEdit && <Button variant="ghost" size="icon" onClick={() => onEdit(item.id)}><Edit className="h-4 w-4" /></Button>}
                  {onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
