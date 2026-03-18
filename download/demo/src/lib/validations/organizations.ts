import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  organizationTypeId: z.string(),
  email: z.string().optional(),
  isActive: z.number().int(),
  uAN: z.string().optional(),
  telNo: z.string().optional(),
  cellNoOne: z.string().optional(),
  countryId: z.string().optional(),
  provinceId: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().optional(),
  code: z.string().optional(),
});

export const createOrganizationSchema = OrganizationSchema.omit({ id: true });
export const updateOrganizationSchema = OrganizationSchema.partial().required({ id: true });
export type OrganizationFormData = z.infer<typeof OrganizationSchema>;
