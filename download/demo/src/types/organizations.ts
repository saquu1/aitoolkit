// TypeScript Types - Auto-generated
// Source: Organizations table

export interface Organization {
  id: string;
  name?: string;
  organizationTypeId: string;
  email?: string;
  isActive: number;
  uAN?: string;
  telNo?: string;
  cellNoOne?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  address?: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  name?: string;
  organizationTypeId: string;
  email?: string;
  isActive: number;
  uAN?: string;
  telNo?: string;
  cellNoOne?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  address?: string;
  code?: string;
}

export interface UpdateOrganizationInput extends Partial<CreateOrganizationInput> {
  id: string;
}
