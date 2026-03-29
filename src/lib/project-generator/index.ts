/**
 * PROJECT GENERATOR MODULE
 * =======================
 * Complete project generation from templates + generated code
 */

export * from './template-manager';
export * from './project-assembler';
export * from './zip-builder';
export * from './validation-checker';

// Re-export singletons
export { templateManager, TemplateManager } from './template-manager';
export { projectAssembler, ProjectAssembler } from './project-assembler';
export { zipBuilder, ZipBuilder } from './zip-builder';
export { validationChecker, ValidationChecker } from './validation-checker';
