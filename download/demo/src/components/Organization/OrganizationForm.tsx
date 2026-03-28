'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface OrganizationFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isEditing?: boolean;
}

export function OrganizationForm({ initialData, onSubmit, isEditing }: OrganizationFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialData || { isActive: true }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* col-md-2 control-label */}
      <div className="space-y-2">
        <Label htmlFor="Name">col-md-2 control-label</Label>
        <Input
          id="Name"
          type="text"
          placeholder="Enter organization name"
          {...register('Name')}
        />
      </div>

      {/* Organization Type */}
      <div className="space-y-2">
        <Label htmlFor="OrganizationTypeId">Organization Type</Label>
        <select
          id="OrganizationTypeId"
          {...register('OrganizationTypeId')}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Select Organization Type</option>
          {/* TODO: Load options from API */}
        </select>
      </div>

      {/* col-md-2 control-label */}
      <div className="space-y-2">
        <Label htmlFor="Email">col-md-2 control-label</Label>
        <Input
          id="Email"
          type="email"
          placeholder="Enter email address"
          {...register('Email')}
        />
      </div>

      {/* UAN */}
      <div className="space-y-2">
        <Label htmlFor="UAN">UAN</Label>
        <Input
          id="UAN"
          type="text"
          placeholder="Enter UAN number"
          {...register('UAN')}
        />
      </div>

      {/* Telephone */}
      <div className="space-y-2">
        <Label htmlFor="TelNo">Telephone</Label>
        <Input
          id="TelNo"
          type="tel"
          placeholder="Enter telephone number"
          {...register('TelNo')}
        />
      </div>

      {/* Mobile */}
      <div className="space-y-2">
        <Label htmlFor="CellNoOne">Mobile</Label>
        <Input
          id="CellNoOne"
          type="tel"
          placeholder="Enter mobile number"
          {...register('CellNoOne')}
        />
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="CountryId">Country</Label>
        <select
          id="CountryId"
          {...register('CountryId')}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Select Country</option>
          {/* TODO: Load options from API */}
        </select>
      </div>

      {/* Province */}
      <div className="space-y-2">
        <Label htmlFor="ProvinceId">Province</Label>
        <select
          id="ProvinceId"
          {...register('ProvinceId')}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Select Province</option>
          {/* TODO: Load options from API */}
        </select>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="CityId">City</Label>
        <select
          id="CityId"
          {...register('CityId')}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Select City</option>
          {/* TODO: Load options from API */}
        </select>
      </div>

      {/* col-md-2 control-label */}
      <div className="space-y-2">
        <Label htmlFor="Address">col-md-2 control-label</Label>
        <Textarea
          id="Address"
          placeholder="Enter complete address"
          {...register('Address')}
          rows={3}
        />
      </div>

      {/* Organization Code */}
      <div className="space-y-2">
        <Label htmlFor="Code">Organization Code</Label>
        <Input
          id="Code"
          type="text"
          placeholder="Enter organization code"
          {...register('Code')}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="IsActive">Status</Label>
        <div className="flex items-center space-x-2">
          <Checkbox id="IsActive" {...register('IsActive')} />
          <label htmlFor="IsActive" className="text-sm">Active</label>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Organization' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
