#!/usr/bin/env npx tsx
// =============================================================================
// Organization Building SOP Import Script
// Imports SOP rules from SRS V1.7 into the SOP Bank
// =============================================================================

import { prisma } from '../src/lib/db';

// SOP Rules extracted from Organization Building SRS V1.7
const SOP_RULES = [
  // Hierarchical CRUD Operations
  {
    category: 'hierarchical_crud',
    ruleKey: 'cascading_dropdown_pattern',
    title: 'Cascading Dropdown Pattern',
    description: 'When user selects a building, filter floors by buildingId. When user selects a floor, filter rooms by floorId.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Use dependent dropdowns that filter options based on parent selection',
  },
  {
    category: 'hierarchical_crud',
    ruleKey: 'parent_required_before_child',
    title: 'Parent Required Before Child Creation',
    description: 'A building must exist before creating floors. A floor must exist before creating rooms.',
    severity: 'required',
    appliesTo: ['Floor', 'Room'],
    implementation: 'Disable create buttons when no parent is selected',
  },
  
  // Validation Rules
  {
    category: 'validation',
    ruleKey: 'building_name_required',
    title: 'Building Name Required',
    description: 'Building name is a mandatory field and cannot be empty.',
    severity: 'required',
    appliesTo: ['Building'],
    field: 'name',
    implementation: 'Add required validation on form submit',
  },
  {
    category: 'validation',
    ruleKey: 'floor_name_required',
    title: 'Floor Name Required',
    description: 'Floor name is a mandatory field and cannot be empty.',
    severity: 'required',
    appliesTo: ['Floor'],
    field: 'name',
    implementation: 'Add required validation on form submit',
  },
  {
    category: 'validation',
    ruleKey: 'room_name_required',
    title: 'Room Name Required',
    description: 'Room name is a mandatory field and cannot be empty.',
    severity: 'required',
    appliesTo: ['Room'],
    field: 'name',
    implementation: 'Add required validation on form submit',
  },
  {
    category: 'validation',
    ruleKey: 'name_max_length_200',
    title: 'Name Maximum Length',
    description: 'All name fields (Building, Floor, Room) must not exceed 200 characters.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'name',
    implementation: 'Add maxLength validation and character counter on input',
  },
  {
    category: 'validation',
    ruleKey: 'description_max_length_500',
    title: 'Description Maximum Length',
    description: 'Description fields must not exceed 500 characters.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'description',
    implementation: 'Add maxLength validation and character counter on textarea',
  },
  
  // Form Behavior
  {
    category: 'form_behavior',
    ruleKey: 'status_default_active',
    title: 'Status Defaults to Active',
    description: 'When creating a new entity, the IsActive status should default to true (active).',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'isActive',
    implementation: 'Set default value to true in form initialization',
  },
  {
    category: 'form_behavior',
    ruleKey: 'submit_creates_and_closes',
    title: 'Submit Creates and Closes Modal',
    description: 'On successful form submission, the modal should close and the list should refresh.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Close modal on success callback and trigger list refresh',
  },
  {
    category: 'form_behavior',
    ruleKey: 'cancel_discards_changes',
    title: 'Cancel Discards Changes',
    description: 'Clicking cancel should discard all form changes and close the modal.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Reset form state and close modal on cancel',
  },
  {
    category: 'form_behavior',
    ruleKey: 'edit_form_populates_data',
    title: 'Edit Form Populates Existing Data',
    description: 'When editing, the form should be pre-populated with existing entity data.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Pass entity data to form component on edit click',
  },
  
  // UX Requirements
  {
    category: 'ux',
    ruleKey: 'search_functionality',
    title: 'Search Functionality',
    description: 'Users should be able to search buildings, floors, and rooms by name.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Add search input with debounced filter on list views',
  },
  {
    category: 'ux',
    ruleKey: 'pagination_support',
    title: 'Pagination Support',
    description: 'List views should support pagination for large datasets.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Implement pagination controls with configurable page size',
  },
  {
    category: 'ux',
    ruleKey: 'sorting_support',
    title: 'Sorting Support',
    description: 'Users should be able to sort lists by name, date, and status.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    implementation: 'Add sortable column headers with asc/desc toggle',
  },
  {
    category: 'ux',
    ruleKey: 'status_indicator',
    title: 'Active/Inactive Status Indicator',
    description: 'Display visual indicator showing whether entity is active or inactive.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'isActive',
    implementation: 'Use badge or icon with color coding (green=active, gray=inactive)',
  },
  
  // Database Rules
  {
    category: 'database',
    ruleKey: 'cascade_delete_building',
    title: 'Cascade Delete - Building',
    description: 'Deleting a building should cascade delete all associated floors and rooms.',
    severity: 'required',
    appliesTo: ['Building'],
    implementation: 'Use ON DELETE CASCADE in foreign key constraints',
  },
  {
    category: 'database',
    ruleKey: 'cascade_delete_floor',
    title: 'Cascade Delete - Floor',
    description: 'Deleting a floor should cascade delete all associated rooms.',
    severity: 'required',
    appliesTo: ['Floor'],
    implementation: 'Use ON DELETE CASCADE in foreign key constraints',
  },
  {
    category: 'database',
    ruleKey: 'unique_name_per_parent',
    title: 'Unique Name Per Parent',
    description: 'Floor names must be unique within a building. Room names must be unique within a floor.',
    severity: 'required',
    appliesTo: ['Floor', 'Room'],
    implementation: 'Add unique constraint on (parentId, name) combination',
  },
  {
    category: 'database',
    ruleKey: 'unique_building_code',
    title: 'Unique Building Code',
    description: 'Building codes must be unique across all buildings.',
    severity: 'standard',
    appliesTo: ['Building'],
    field: 'code',
    implementation: 'Add unique constraint on code field',
  },
  
  // Audit Fields
  {
    category: 'audit',
    ruleKey: 'created_at_timestamp',
    title: 'Created At Timestamp',
    description: 'All entities should have a CreatedAt field automatically set on creation.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'createdAt',
    implementation: 'Use database default value (GETDATE() or NOW())',
  },
  {
    category: 'audit',
    ruleKey: 'updated_at_timestamp',
    title: 'Updated At Timestamp',
    description: 'All entities should have an UpdatedAt field automatically updated on modification.',
    severity: 'required',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'updatedAt',
    implementation: 'Use database trigger or ORM @updatedAt annotation',
  },
  {
    category: 'audit',
    ruleKey: 'created_by_tracking',
    title: 'Created By Tracking',
    description: 'Track which user created the entity for audit purposes.',
    severity: 'standard',
    appliesTo: ['Building', 'Floor', 'Room'],
    field: 'createdBy',
    implementation: 'Store user ID from authentication context',
  },
];

async function importSOPs(projectId: string) {
  console.log(`\n📋 Importing Organization Building SOPs for project: ${projectId}\n`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const rule of SOP_RULES) {
    try {
      // Check if SOP already exists
      const existing = await prisma.unifiedSOPRule.findFirst({
        where: {
          projectId,
          sopId: `ORG-BLD-${rule.ruleKey.toUpperCase()}`,
        }
      });

      const sopData = {
        projectId,
        sopId: `ORG-BLD-${rule.ruleKey.toUpperCase()}`,
        name: rule.title,
        description: rule.description,
        category: rule.category,
        priority: rule.severity === 'required' ? 100 : rule.severity === 'standard' ? 50 : 25,
        isActive: true,
        appliesTo: JSON.stringify(rule.appliesTo),
        condition: JSON.stringify({ field: rule.field }),
        expectedValue: rule.implementation,
        autoFixAction: null,
        sourceDocument: 'Organization Building SRS V1.7',
        sourceVersion: '1.7',
        isSystemDefault: false,
        isCustom: false,
      };

      if (existing) {
        await prisma.unifiedSOPRule.update({
          where: { id: existing.id },
          data: sopData
        });
        updated++;
        console.log(`  ✓ Updated: ${rule.title}`);
      } else {
        await prisma.unifiedSOPRule.create({
          data: sopData
        });
        created++;
        console.log(`  + Created: ${rule.title}`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${rule.title}`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${SOP_RULES.length}\n`);

  return { created, updated, skipped };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(a => a.startsWith('--project='));
  
  if (!projectArg) {
    console.error('Usage: npx tsx scripts/import-org-building-sop.ts --project=<projectId>');
    console.error('\nTo find your project ID, check the ToolkitProject table or use:');
    console.error('  npx tsx -e "const {prisma} = require(\'./src/lib/db\'); prisma.toolkitProject.findMany().then(console.log)"');
    process.exit(1);
  }

  const projectId = projectArg.split('=')[1];

  // Verify project exists
  const project = await prisma.toolkitProject.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    console.error(`Project not found: ${projectId}`);
    process.exit(1);
  }

  console.log(`Project: ${project.name || projectId}`);

  await importSOPs(projectId);
  
  await prisma.$disconnect();
}

main().catch(console.error);
