"use client";

// =============================================================================
// Generated React Form Component - Patient
// =============================================================================
// Source: SQL DDL + SP Intelligence + CSHTML Analysis
// Generated: 2024-01-15
//
// SP Intelligence Applied:
// - Validation rules from sp_Patient_Create
// - Field requirements from SP parameters
// - UI component types from CSHTML analysis
// - Error code mappings from SP RAISERROR
// =============================================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, AlertCircle } from 'lucide-react';
import type { Patient, Branch } from '@/types';

// =============================================================================
// Validation Schema (from SP Intelligence)
// =============================================================================

const patientFormSchema = z.object({
  mrn: z.string()
    .min(3, 'MRN must be at least 3 characters') // From SP: IF @MRN IS NULL
    .max(20, 'MRN cannot exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'MRN must contain only uppercase letters and numbers'),
  firstName: z.string()
    .min(1, 'First Name is required') // From SP: IF @FirstName IS NULL
    .max(100, 'First Name cannot exceed 100 characters'),
  lastName: z.string()
    .min(1, 'Last Name is required') // From SP: IF @LastName IS NULL
    .max(100, 'Last Name cannot exceed 100 characters'),
  dateOfBirth: z.date({
    required_error: 'Date of Birth is required', // From SP
    invalid_type_error: 'Invalid date format',
  })
    .refine(d => d <= new Date(), 'Date of Birth cannot be in the future') // From SP
    .refine(d => {
      const age = new Date().getFullYear() - d.getFullYear();
      return age <= 150;
    }, 'Invalid Date of Birth - age cannot exceed 150 years'), // From SP
  gender: z.enum(['M', 'F', 'O'], {
    required_error: 'Gender is required', // From SP
    invalid_type_error: 'Gender must be M, F, or O',
  }),
  phone: z.string().max(20).optional(),
  email: z.string().email('Invalid email format').max(100).optional().or(z.literal('')), // From SP email check
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  branchId: z.string().uuid('Invalid Branch selected'), // From SP branch validation
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

// =============================================================================
// Props Interface
// =============================================================================

interface PatientFormProps {
  initialData?: Patient;
  branches: Branch[];
  onSubmit: (data: PatientFormValues) => Promise<void>;
  onCheckMRN?: (mrn: string) => Promise<boolean>;
  isEditing?: boolean;
  isLoading?: boolean;
}

// =============================================================================
// Form Component
// =============================================================================

export function PatientForm({
  initialData,
  branches,
  onSubmit,
  onCheckMRN,
  isEditing = false,
  isLoading = false,
}: PatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mrnChecking, setMrnChecking] = useState(false);
  const [mrnError, setMrnError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      dateOfBirth: new Date(initialData.dateOfBirth),
    } : {
      country: 'USA',
    },
    mode: 'onBlur', // From CSHTML validation pattern
  });

  // MRN uniqueness check (from SP and CSHTML remote validation)
  const checkMRN = async (mrn: string) => {
    if (!mrn || mrn.length < 3 || !onCheckMRN) return;
    if (isEditing && initialData?.mrn === mrn) return; // Skip for same MRN

    setMrnChecking(true);
    setMrnError(null);

    try {
      const exists = await onCheckMRN(mrn);
      if (exists) {
        setMrnError('This MRN already exists'); // From SP: Patient with this MRN already exists
        form.setError('mrn', { message: 'This MRN already exists' });
      }
    } catch (error) {
      console.error('MRN check failed:', error);
    } finally {
      setMrnChecking(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: PatientFormValues) => {
    if (mrnError) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast({
        title: isEditing ? 'Patient Updated' : 'Patient Created',
        description: `Patient ${data.firstName} ${data.lastName} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
    } catch (error: any) {
      // Handle SP error codes
      const errorCode = error.code || error.response?.data?.code;
      
      if (errorCode === -5) {
        setMrnError('Patient with this MRN already exists');
        form.setError('mrn', { message: 'This MRN already exists' });
        return;
      }

      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          {isEditing ? 'Edit' : 'New'} Patient
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Row 1: MRN, Branch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* MRN Field - From CSHTML */}
              <FormField
                control={form.control}
                name="mrn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      MRN <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          placeholder="Enter MRN"
                          className="bg-slate-700/50 border-slate-600 text-slate-100"
                          onBlur={(e) => {
                            field.onBlur();
                            checkMRN(e.target.value);
                          }}
                          onChange={(e) => {
                            field.onChange(e.target.value.toUpperCase());
                            setMrnError(null);
                          }}
                        />
                        {mrnChecking && (
                          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    </FormControl>
                    {mrnError && (
                      <div className="flex items-center gap-1 text-red-400 text-sm mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {mrnError}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Branch Dropdown - From CSHTML */}
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Branch <span className="text-red-400">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                          <SelectValue placeholder="-- Select Branch --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {branches.map((branch) => (
                          <SelectItem
                            key={branch.id}
                            value={branch.id}
                            className="text-slate-100 focus:bg-slate-700"
                          >
                            {branch.code} - {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: First Name, Last Name, Date of Birth */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      First Name <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter first name"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Last Name <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter last name"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Date of Birth <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Gender, Phone, Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Gender <span className="text-red-400">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                          <SelectValue placeholder="-- Select Gender --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="M" className="text-slate-100">Male</SelectItem>
                        <SelectItem value="F" className="text-slate-100">Female</SelectItem>
                        <SelectItem value="O" className="text-slate-100">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="Enter phone number"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter email"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter full address"
                        className="bg-slate-700/50 border-slate-600 text-slate-100 min-h-[60px]"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 5: City, State, Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter city"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">State</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                          <SelectValue placeholder="-- Select State --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="CA" className="text-slate-100">California</SelectItem>
                        <SelectItem value="NY" className="text-slate-100">New York</SelectItem>
                        <SelectItem value="TX" className="text-slate-100">Texas</SelectItem>
                        {/* More states */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Zip Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter zip code"
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t border-slate-700 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          onClick={form.handleSubmit(handleSubmit)}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isEditing ? 'Update' : 'Save'} Patient
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PatientForm;
