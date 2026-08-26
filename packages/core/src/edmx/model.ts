import { EdmModel } from '../ast'

/**
 * Parse EDMX (OData $metadata XML) into an EdmModel.
 */
export function parseEdmx(xml: string): EdmModel {
  // Stub for Phase 1. Real implementation in Phase 7.
  return {
    namespaces: [],
    entityTypes: new Map(),
    complexTypes: new Map(),
    enumTypes: new Map(),
    entitySets: new Map(),
    functions: new Map(),
  }
}
