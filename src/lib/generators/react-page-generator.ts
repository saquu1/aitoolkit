// =============================================================================
// React Page Generator
// =============================================================================
// Generates complete Next.js pages combining:
// - Form component (Create/Edit)
// - Data Table component (List)
// - Page layout with navigation
// - CRUD operations wiring
// =============================================================================

import type { SPDrivenGenerationResult, FormFieldDefinition, TableColumnDefinition } from '../sp-driven-code-generator';

export interface ReactPageGenerationResult {
  // List Page (DataTable + Search + Filters)
  listPage: {
    component: string;
    path: string;
    fileName: string;
  };
  
  // Form Page (Create/Edit form)
  formPage: {
    component: string;
    path: string;
    fileName: string;
  };
  
  // Detail Page (Read-only view)
  detailPage: {
    component: string;
    path: string;
    fileName: string;
  };
  
  // Page-specific hooks
  hooks: {
    useList: string;
    useItem: string;
    useMutations: string;
  };
  
  // Navigation config
  navigation: {
    sidebarItem: string;
    routeConfig: string;
  };
}

export interface PageGenerationConfig {
  moduleName: string;
  basePath: string;
  includeSearch: boolean;
  includeFilters: boolean;
  includeExport: boolean;
  includeBulkActions: boolean;
  softDelete: boolean;
  multiTenant: boolean;
  auditFields: string[];
}

export class ReactPageGenerator {
  
  /**
   * Generate all page components from SP-driven generation result
   */
  generatePages(
    spResult: SPDrivenGenerationResult,
    config?: Partial<PageGenerationConfig>
  ): ReactPageGenerationResult {
    
    const typeName = this.toPascalSingular(spResult.tableName);
    const varName = this.toCamelCase(spResult.tableName);
    const basePath = config?.basePath || `/${varName}`;
    
    const pageConfig: PageGenerationConfig = {
      moduleName: spResult.moduleName || typeName,
      basePath,
      includeSearch: spResult.table.searchableColumns.length > 0,
      includeFilters: spResult.intelligence.validationRules.length > 0,
      includeExport: true,
      includeBulkActions: spResult.prisma.softDeleteField !== null,
      softDelete: spResult.prisma.softDeleteField !== null,
      multiTenant: spResult.prisma.multiTenantField !== null,
      auditFields: spResult.prisma.auditFields,
      ...config
    };
    
    return {
      listPage: this.generateListPage(typeName, varName, spResult, pageConfig),
      formPage: this.generateFormPage(typeName, varName, spResult, pageConfig),
      detailPage: this.generateDetailPage(typeName, varName, spResult, pageConfig),
      hooks: this.generateHooks(typeName, varName, spResult, pageConfig),
      navigation: this.generateNavigation(typeName, varName, pageConfig)
    };
  }
  
  // ===========================================================================
  // LIST PAGE GENERATOR
  // ===========================================================================
  
  private generateListPage(
    typeName: string,
    varName: string,
    spResult: SPDrivenGenerationResult,
    config: PageGenerationConfig
  ): ReactPageGenerationResult['listPage'] {
    
    const searchableColumns = spResult.table.searchableColumns;
    const sortableColumns = spResult.table.sortableColumns;
    const columns = spResult.table.columns;
    
    const component = `"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ${typeName}DataTable } from '@/components/${varName}/${typeName}DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { use${typeName}List } from '@/hooks/use${typeName}';
import { useToast } from '@/hooks/use-toast';

// ${typeName} List Page
// Module: ${config.moduleName}
// Generated from SP Intelligence
// Soft Delete: ${config.softDelete ? 'Yes' : 'No'}
// Multi-Tenant: ${config.multiTenant ? 'Yes' : 'No'}

export default function ${typeName}ListPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('${columns[0]?.name || 'createdAt'}');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Fetch data
  const { items, pagination, isLoading, error, refetch, deleteItem } = use${typeName}List({
    search,
    page,
    pageSize,
    sortBy,
    sortOrder
  });
  
  // Handle create
  const handleCreate = useCallback(() => {
    router.push('/${varName}/new');
  }, [router]);
  
  // Handle edit
  const handleEdit = useCallback((id: string) => {
    router.push(\`/${varName}/\${id}/edit\`);
  }, [router]);
  
  // Handle view
  const handleView = useCallback((id: string) => {
    router.push(\`/${varName}/\${id}\`);
  }, [router]);
  
  // Handle delete${config.softDelete ? ' (soft delete)' : ''}
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this ${typeName.toLowerCase()}?')) return;
    
    try {
      await deleteItem(id);
      toast({
        title: '${typeName} Deleted',
        description: 'The ${typeName.toLowerCase()} has been ${config.softDelete ? 'archived' : 'deleted'} successfully.',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ${typeName.toLowerCase()}.',
        variant: 'destructive',
      });
    }
  }, [deleteItem, refetch, toast]);
  
  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(\`Are you sure you want to delete \${selectedIds.length} items?\`)) return;
    
    try {
      await Promise.all(selectedIds.map(id => deleteItem(id)));
      toast({
        title: 'Items Deleted',
        description: \`\${selectedIds.length} items have been ${config.softDelete ? 'archived' : 'deleted'}.\`,
      });
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete items.',
        variant: 'destructive',
      });
    }
  }, [selectedIds, deleteItem, refetch, toast]);
  
  // Handle export
  const handleExport = useCallback(() => {
    // Export to CSV
    const csv = [
      '${columns.map(c => c.header).join(',')}',
      ...items.map((item: any) => 
        '${columns.map(c => `\${item.${c.name} || ''}`).join(',')}'
      )
    ].join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${varName}_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">${typeName} Management</h1>
          <p className="text-sm text-slate-400">
            Manage ${typeName.toLowerCase()} records for ${config.moduleName}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New ${typeName}
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            ${searchableColumns.length > 0 ? `
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search ${typeName.toLowerCase()}..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600"
                />
              </div>
            </div>
            ` : ''}
            
            {/* Page Size */}
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => setPageSize(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] bg-slate-700/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-[150px] bg-slate-700/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                ${columns.filter(c => c.sortable).map(c => 
                  `<SelectItem value="${c.name}">${c.header}</SelectItem>`
                ).join('\n                ')}
              </SelectContent>
            </Select>
            
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}
            >
              <SelectTrigger className="w-[100px] bg-slate-700/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Actions */}
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className={\`w-4 h-4 \${isLoading ? 'animate-spin' : ''}\`} />
            </Button>
            
            ${config.includeExport ? `
            <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            ` : ''}
            
            ${config.includeBulkActions ? `
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedIds.length})
              </Button>
            )}
            ` : ''}
          </div>
        </CardContent>
      </Card>
      
      {/* Data Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <${typeName}DataTable
            data={items}
            isLoading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
`;

    return {
      component,
      path: `/app${config.basePath}/page.tsx`,
      fileName: 'page.tsx'
    };
  }
  
  // ===========================================================================
  // FORM PAGE GENERATOR
  // ===========================================================================
  
  private generateFormPage(
    typeName: string,
    varName: string,
    spResult: SPDrivenGenerationResult,
    config: PageGenerationConfig
  ): ReactPageGenerationResult['formPage'] {
    
    const formFields = spResult.form.fields;
    const isEditing = spResult.intelligence.formMode === 'update';
    
    const component = `"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ${typeName}Form } from '@/components/${varName}/${typeName}Form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { use${typeName}Item, use${typeName}Mutations } from '@/hooks/use${typeName}';
import { useToast } from '@/hooks/use-toast';

// ${typeName} Form Page
// Mode: ${isEditing ? 'Edit' : 'Create'}
// Generated from SP Intelligence
// Editable Fields: ${formFields.length}

export default function ${typeName}FormPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const id = params?.id as string;
  const isEditing = !!id;
  
  // Fetch existing item for edit
  const { item, isLoading: isLoadingItem } = use${typeName}Item(id);
  
  // Mutations
  const { createItem, updateItem, isCreating, isUpdating } = use${typeName}Mutations();
  
  // Loading state
  const isSubmitting = isCreating || isUpdating;
  
  // Handle submit
  const handleSubmit = useCallback(async (data: any) => {
    try {
      if (isEditing) {
        await updateItem({ id, ...data });
        toast({
          title: '${typeName} Updated',
          description: 'The ${typeName.toLowerCase()} has been updated successfully.',
        });
      } else {
        const result = await createItem(data);
        toast({
          title: '${typeName} Created',
          description: 'The ${typeName.toLowerCase()} has been created successfully.',
        });
        router.push(\`/${varName}/\${result.id}\`);
      }
    } catch (error: any) {
      // Handle SP error codes
      if (error.message?.includes('-5') || error.message?.includes('duplicate')) {
        toast({
          title: 'Duplicate Entry',
          description: 'A record with this identifier already exists.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || \`Failed to \${isEditing ? 'update' : 'create'} ${typeName.toLowerCase()}.\`,
          variant: 'destructive',
        });
      }
      throw error;
    }
  }, [isEditing, id, createItem, updateItem, router, toast]);
  
  // Handle back
  const handleBack = useCallback(() => {
    router.push('/${varName}');
  }, [router]);
  
  if (isEditing && isLoadingItem) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isEditing ? 'Edit' : 'New'} ${typeName}
          </h1>
          <p className="text-sm text-slate-400">
            {isEditing ? 'Update the ${typeName.toLowerCase()} details' : 'Create a new ${typeName.toLowerCase()}'}
          </p>
        </div>
      </div>
      
      {/* Form */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">${typeName} Details</CardTitle>
        </CardHeader>
        <CardContent>
          <${typeName}Form
            initialData={item}
            onSubmit={handleSubmit}
            isEditing={isEditing}
          />
        </CardContent>
      </Card>
    </div>
  );
}
`;

    return {
      component,
      path: `/app${config.basePath}/[id]/edit/page.tsx`,
      fileName: 'page.tsx'
    };
  }
  
  // ===========================================================================
  // DETAIL PAGE GENERATOR
  // ===========================================================================
  
  private generateDetailPage(
    typeName: string,
    varName: string,
    spResult: SPDrivenGenerationResult,
    config: PageGenerationConfig
  ): ReactPageGenerationResult['detailPage'] {
    
    const columns = spResult.table.columns;
    
    const component = `"use client";

import { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { use${typeName}Item, use${typeName}Mutations } from '@/hooks/use${typeName}';
import { useToast } from '@/hooks/use-toast';

// ${typeName} Detail Page
// Generated from SP Intelligence

export default function ${typeName}DetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const id = params?.id as string;
  
  // Fetch item
  const { item, isLoading, error } = use${typeName}Item(id);
  
  // Mutations
  const { deleteItem, isDeleting } = use${typeName}Mutations();
  
  // Handle edit
  const handleEdit = useCallback(() => {
    router.push(\`/${varName}/\${id}/edit\`);
  }, [router, id]);
  
  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this ${typeName.toLowerCase()}?')) return;
    
    try {
      await deleteItem(id);
      toast({
        title: '${typeName} Deleted',
        description: 'The ${typeName.toLowerCase()} has been ${config.softDelete ? 'archived' : 'deleted'} successfully.',
      });
      router.push('/${varName}');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ${typeName.toLowerCase()}.',
        variant: 'destructive',
      });
    }
  }, [deleteItem, id, router, toast]);
  
  // Handle back
  const handleBack = useCallback(() => {
    router.push('/${varName}');
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (error || !item) {
    return (
      <div className="container mx-auto py-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">${typeName} not found</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">${typeName} Details</h1>
            <p className="text-sm text-slate-400">View ${typeName.toLowerCase()} information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            ${config.softDelete ? 'Archive' : 'Delete'}
          </Button>
        </div>
      </div>
      
      {/* Details */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            ${columns.map(col => `
            <div>
              <label className="text-sm text-slate-400">${col.header}</label>
              <p className="text-slate-100 mt-1">
                {item.${col.name} !== null && item.${col.name} !== undefined
                  ? String(item.${col.name})
                  : '-'}
              </p>
            </div>
            `).join('')}
          </div>
        </CardContent>
      </Card>
      
      ${config.auditFields.length > 0 ? `
      {/* Audit Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Audit Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            ${config.auditFields.map(field => `
            <div>
              <label className="text-sm text-slate-400">${this.generateLabel(field)}</label>
              <p className="text-slate-100 mt-1">{item.${this.toCamelCase(field)} || '-'}</p>
            </div>
            `).join('')}
          </div>
        </CardContent>
      </Card>
      ` : ''}
    </div>
  );
}
`;

    return {
      component,
      path: `/app${config.basePath}/[id]/page.tsx`,
      fileName: 'page.tsx'
    };
  }
  
  // ===========================================================================
  // HOOKS GENERATOR
  // ===========================================================================
  
  private generateHooks(
    typeName: string,
    varName: string,
    spResult: SPDrivenGenerationResult,
    config: PageGenerationConfig
  ): ReactPageGenerationResult['hooks'] {
    
    const useList = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

interface ${typeName}ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function use${typeName}List(params: ${typeName}ListParams = {}) {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['${varName}', 'list', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      
      const res = await fetch(\`/api/${varName}?\${searchParams}\`);
      if (!res.ok) throw new Error('Failed to fetch ${typeName}');
      return res.json();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(\`/api/${varName}?id=\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${typeName}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${varName}', 'list'] });
    }
  });
  
  return {
    items: data?.items || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    deleteItem: deleteMutation.mutateAsync
  };
}
`;

    const useItem = `import { useQuery } from '@tanstack/react-query';

export function use${typeName}Item(id: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['${varName}', 'item', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(\`/api/${varName}/\${id}\`);
      if (!res.ok) throw new Error('Failed to fetch ${typeName}');
      return res.json();
    },
    enabled: !!id
  });
  
  return {
    item: data,
    isLoading,
    error
  };
}
`;

    const useMutations = `import { useMutation, useQueryClient } from '@tanstack/react-query';

export function use${typeName}Mutations() {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/${varName}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create ${typeName}');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${varName}'] });
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/${varName}', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update ${typeName}');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${varName}'] });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(\`/api/${varName}?id=\${id}\`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete ${typeName}');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${varName}'] });
    }
  });
  
  return {
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
`;

    return {
      useList,
      useItem,
      useMutations
    };
  }
  
  // ===========================================================================
  // NAVIGATION GENERATOR
  // ===========================================================================
  
  private generateNavigation(
    typeName: string,
    varName: string,
    config: PageGenerationConfig
  ): ReactPageGenerationResult['navigation'] {
    
    const sidebarItem = `{
  name: '${typeName}',
  href: '/${varName}',
  icon: Database, // Import from lucide-react
  badge: null,
  children: [
    { name: 'All ${typeName}', href: '/${varName}' },
    { name: 'New ${typeName}', href: '/${varName}/new' }
  ]
}`;

    const routeConfig = `{
  path: '/${varName}',
  name: '${typeName} Management',
  module: '${config.moduleName}',
  routes: [
    { path: '/${varName}', name: 'List', component: '${typeName}ListPage' },
    { path: '/${varName}/new', name: 'Create', component: '${typeName}FormPage' },
    { path: '/${varName}/:id', name: 'Detail', component: '${typeName}DetailPage' },
    { path: '/${varName}/:id/edit', name: 'Edit', component: '${typeName}FormPage' }
  ]
}`;

    return {
      sidebarItem,
      routeConfig
    };
  }
  
  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================
  
  private toPascalSingular(name: string): string {
    let pascal = name.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
    
    // Singularize common patterns
    if (pascal.endsWith('ies')) return pascal.slice(0, -3) + 'y';
    if (pascal.endsWith('ses')) return pascal.slice(0, -2);
    if (pascal.endsWith('s') && !pascal.endsWith('ss')) return pascal.slice(0, -1);
    
    return pascal;
  }
  
  private toCamelCase(name: string): string {
    return name.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toLowerCase());
  }
  
  private generateLabel(columnName: string): string {
    return columnName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

// Export singleton instance
export const reactPageGenerator = new ReactPageGenerator();

// Export convenience functions for direct import
export function generatePages(spResult: any, config?: Partial<PageGenerationConfig>) {
  return reactPageGenerator.generatePages(spResult, config);
}

export function generateFullCRUD(spResult: any, config?: Partial<PageGenerationConfig>) {
  return reactPageGenerator.generatePages(spResult, config);
}
