import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useOrganizationList(params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['organizations', 'list', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.page) sp.set('page', params.page.toString());
      if (params?.pageSize) sp.set('pageSize', params.pageSize.toString());
      const res = await fetch(`/api/organizations?${sp}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
}

export function useOrganizationItem(id: string | undefined) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/organizations?id=${id}`);
      return res.json();
    },
    enabled: !!id
  });
}

export function useOrganizationMutations() {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] })
  });
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/organizations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] })
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/organizations?id=${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] })
  });
  return { createItem: createMutation.mutateAsync, updateItem: updateMutation.mutateAsync, deleteItem: deleteMutation.mutateAsync };
}
