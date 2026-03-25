import type { Rule } from '../core/rule.js';
import { noRequiredFalse } from './no-required-false.js';
import { noContentEncoding } from './no-content-encoding.js';
import { descriptionExists } from './description-exists.js';
import { noEmptyEnum } from './no-empty-enum.js';
import { maxDepth } from './max-depth.js';
import { noRecursiveRefs } from './no-recursive-refs.js';
import { validJsonSchemaSubset } from './valid-json-schema-subset.js';
import { noUnsupportedFormats } from './no-unsupported-formats.js';

export const allRules: Rule[] = [
  noRequiredFalse,
  noContentEncoding,
  descriptionExists,
  noEmptyEnum,
  maxDepth,
  noRecursiveRefs,
  validJsonSchemaSubset,
  noUnsupportedFormats,
];
