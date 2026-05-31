import { validateCommandArgs } from "@consoler/protocol";

import type {
  IntentCandidate,
  IntentDraftResult,
  IntentScope,
  IntentScopeCommand
} from "./intent-draft-types.js";

const SCORE_ACTION_HINT = 5;
const SCORE_PRODUCT_LABEL = 4;
const SCORE_COMMAND_TOKEN = 3;
const SCORE_DESCRIPTION = 1;
const AMBIGUITY_MARGIN = 2;
const NEARBY_HINT_RADIUS = 24;
const PATH_HINT_LOOKBACK = 12;

const MESSAGES = {
  no_match: "No matching action found.",
  ambiguous_command: "More than one action matched.",
  missing_required_args: (fields: string[]) => `Missing required fields: ${fields.join(", ")}.`,
  ambiguous_args: "Could not assign extracted values to fields unambiguously.",
  unsupported_schema: "This action's input schema is not supported by intent drafting."
} as const;

type PrimitiveFieldType = "string" | "boolean" | "number" | "integer";

interface FieldInfo {
  name: string;
  type: PrimitiveFieldType;
  required: boolean;
  enumValues?: Array<string | number | boolean>;
  hints: string[];
  pathLike: boolean;
  vaultLike: boolean;
  sourceLike: boolean;
}

interface ExtractedLiteral {
  kind: "string" | "path" | "url" | "number" | "integer" | "boolean";
  value: string | number | boolean;
  start: number;
  end: number;
}

interface SchemaAnalysis {
  supported: boolean;
  unsupportedFeatures: string[];
  fields: FieldInfo[];
  required: string[];
}

interface AssignmentResult {
  prefilled_args: Record<string, unknown>;
  ambiguous_fields: string[];
}

export function draftIntent(input: { text: string; scope: IntentScope }): IntentDraftResult {
  const text = input.text.trim();
  if (!text) {
    return clarification("no_match", MESSAGES.no_match);
  }

  const ranked = rankCommands(text, input.scope.commands);
  if (ranked.length === 0 || ranked[0]!.score <= 0) {
    return clarification("no_match", MESSAGES.no_match);
  }

  const top = ranked[0]!;
  const second = ranked[1];
  if (second && top.score - second.score < AMBIGUITY_MARGIN) {
    return clarification("ambiguous_command", MESSAGES.ambiguous_command);
  }

  const command = top.command;
  const schema = analyzeSchema(command);
  if (!schema.supported) {
    return {
      outcome: "needs_clarification",
      reason: "unsupported_schema",
      message: MESSAGES.unsupported_schema,
      unsupported_features: schema.unsupportedFeatures
    };
  }

  const literals = extractLiterals(text);
  const pathLiterals = literals.filter((literal) => literal.kind === "path");
  if (
    pathLiterals.length > 2 &&
    hasSingleFilePathConstraint(schema.fields)
  ) {
    return clarification("ambiguous_args", MESSAGES.ambiguous_args, command, {});
  }

  const assignment = assignFields(text, schema.fields, literals);
  if (
    pathLiterals.length > 1 &&
    hasSingleFilePathConstraint(schema.fields) &&
    assignment.ambiguous_fields.includes("path")
  ) {
    return clarification("ambiguous_args", MESSAGES.ambiguous_args, command, assignment.prefilled_args);
  }
  if (assignment.ambiguous_fields.length > 0) {
    return clarification("ambiguous_args", MESSAGES.ambiguous_args, command, assignment.prefilled_args, {
      ambiguous_fields: assignment.ambiguous_fields
    });
  }

  const missingRequired = schema.required.filter(
    (fieldName) => assignment.prefilled_args[fieldName] === undefined
  );
  if (missingRequired.length > 0) {
    return {
      outcome: "needs_clarification",
      reason: "missing_required_args",
      message: MESSAGES.missing_required_args(missingRequired),
      missing_required_args: missingRequired,
      partial_candidate: buildCandidate(command, assignment.prefilled_args)
    };
  }

  const validation = validateCommandArgs(command.args_schema, assignment.prefilled_args);
  if (!validation.ok) {
    return clarification("ambiguous_args", MESSAGES.ambiguous_args, command, assignment.prefilled_args);
  }

  return {
    outcome: "candidate",
    candidate: buildCandidate(command, assignment.prefilled_args)
  };
}

function clarification(
  reason: Extract<IntentDraftResult, { outcome: "needs_clarification" }>["reason"],
  message: string,
  command?: IntentScopeCommand,
  prefilled_args: Record<string, unknown> = {},
  extra: Partial<Extract<IntentDraftResult, { outcome: "needs_clarification" }>> = {}
): IntentDraftResult {
  const result: Extract<IntentDraftResult, { outcome: "needs_clarification" }> = {
    outcome: "needs_clarification",
    reason,
    message,
    ...extra
  };
  if (command && Object.keys(prefilled_args).length > 0) {
    result.partial_candidate = buildCandidate(command, prefilled_args);
  }
  return result;
}

function buildCandidate(
  command: IntentScopeCommand,
  prefilled_args: Record<string, unknown>
): IntentCandidate {
  const candidate: IntentCandidate = {
    agent_id: command.agent_id,
    command: command.command,
    prefilled_args: { ...prefilled_args }
  };
  if (command.product_action_id) {
    candidate.product_action_id = command.product_action_id;
  }
  return candidate;
}

function rankCommands(
  text: string,
  commands: IntentScopeCommand[]
): Array<{ command: IntentScopeCommand; score: number }> {
  const scored = commands
    .map((command) => ({ command, score: scoreCommand(text, command) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.command.command.localeCompare(right.command.command);
    });
  return scored;
}

function scoreCommand(text: string, command: IntentScopeCommand): number {
  const normalized = normalizeText(text);
  let score = 0;

  for (const hint of command.action_hints ?? []) {
    const normalizedHint = normalizeText(hint);
    if (normalizedHint && normalized.includes(normalizedHint)) {
      score += SCORE_ACTION_HINT;
    }
  }

  if (command.product_label) {
    const label = normalizeText(command.product_label);
    if (label && normalized.includes(label)) {
      score += SCORE_PRODUCT_LABEL;
    }
  }

  for (const token of commandTokens(command.command)) {
    if (token.length >= 2 && normalized.includes(token)) {
      score += SCORE_COMMAND_TOKEN;
    }
  }

  if (command.product_description) {
    const description = normalizeText(command.product_description);
    if (description && normalized.includes(description)) {
      score += SCORE_DESCRIPTION;
    }
  }

  const commandDescription = normalizeText(command.command_description);
  if (commandDescription && normalized.includes(commandDescription)) {
    score += SCORE_DESCRIPTION;
  }

  return score;
}

function commandTokens(command: string): string[] {
  return command
    .split(/[./:_-]+/)
    .map((token) => normalizeText(token))
    .filter((token) => token.length > 0);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function analyzeSchema(command: IntentScopeCommand): SchemaAnalysis {
  const unsupportedFeatures = collectUnsupportedSchemaFeatures(command.args_schema);
  if (unsupportedFeatures.length > 0) {
    return { supported: false, unsupportedFeatures, fields: [], required: [] };
  }

  const schema = command.args_schema;
  const properties = schema.properties as Record<string, unknown>;
  const required = Array.isArray(schema.required)
    ? schema.required.filter((field): field is string => typeof field === "string")
    : [];

  const fields: FieldInfo[] = [];
  for (const [name, rawField] of Object.entries(properties)) {
    const fieldSchema = rawField as Record<string, unknown>;
    const type = fieldSchema.type;
    if (
      type !== "string" &&
      type !== "boolean" &&
      type !== "number" &&
      type !== "integer"
    ) {
      continue;
    }
    const hints = buildFieldHints(command, name, fieldSchema);
    const pathLike = isPathLikeCorpus(hints.join(" "));
    const fieldInfo: FieldInfo = {
      name,
      type: type as PrimitiveFieldType,
      required: required.includes(name),
      hints,
      pathLike,
      vaultLike: isVaultLikeCorpus(hints.join(" "), name),
      sourceLike: isSourceLikeCorpus(hints.join(" "), name)
    };
    const enumValues = readPrimitiveEnum(fieldSchema.enum);
    if (enumValues) {
      fieldInfo.enumValues = enumValues;
    }
    fields.push(fieldInfo);
  }

  return { supported: true, unsupportedFeatures: [], fields, required };
}

function collectUnsupportedSchemaFeatures(schema: Record<string, unknown>): string[] {
  const features: string[] = [];
  for (const keyword of [
    "$ref",
    "oneOf",
    "anyOf",
    "allOf",
    "patternProperties",
    "if",
    "then",
    "else"
  ]) {
    if (keyword in schema) {
      features.push(`keyword:${keyword}`);
    }
  }

  if (schema.type !== "object") {
    features.push("root:not_object");
    return features;
  }

  const properties = schema.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    features.push("root:missing_properties");
    return features;
  }

  for (const [name, rawField] of Object.entries(properties)) {
    const field = rawField as Record<string, unknown>;
    if (field.$ref) {
      features.push(`field:${name}:$ref`);
      continue;
    }
    for (const keyword of ["oneOf", "anyOf", "allOf", "patternProperties", "if", "then", "else"]) {
      if (keyword in field) {
        features.push(`field:${name}:keyword:${keyword}`);
      }
    }
    const type = field.type;
    if (type === "object") {
      features.push(`field:${name}:object`);
    } else if (type === "array") {
      features.push(`field:${name}:array`);
    } else if (
      type !== "string" &&
      type !== "boolean" &&
      type !== "number" &&
      type !== "integer"
    ) {
      features.push(`field:${name}:unsupported_type`);
    } else if (field.enum && !isPrimitiveEnum(field.enum)) {
      features.push(`field:${name}:unsupported_enum`);
    }
  }

  return features;
}

function isPrimitiveEnum(values: unknown): values is Array<string | number | boolean> {
  return (
    Array.isArray(values) &&
    values.every(
      (value) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    )
  );
}

function readPrimitiveEnum(values: unknown): Array<string | number | boolean> | undefined {
  if (!isPrimitiveEnum(values)) return undefined;
  return [...values];
}

function buildFieldHints(
  command: IntentScopeCommand,
  fieldName: string,
  fieldSchema: Record<string, unknown>
): string[] {
  const hints = [fieldName];
  if (typeof fieldSchema.description === "string") {
    hints.push(fieldSchema.description);
  }
  for (const hint of command.field_hints?.[fieldName] ?? []) {
    hints.push(hint);
  }
  const labels = command.field_labels?.[fieldName];
  if (labels?.label) hints.push(labels.label);
  if (labels?.help) hints.push(labels.help);
  return hints.map((hint) => normalizeText(hint)).filter((hint) => hint.length > 0);
}

function isPathLikeCorpus(corpus: string): boolean {
  return /path|file|source|vault|目录|文件|知识库|库/.test(corpus);
}

function isVaultLikeCorpus(corpus: string, fieldName: string): boolean {
  if (/vault|知识库|库/.test(corpus) && !/source|file|文件|源/.test(corpus)) {
    return true;
  }
  return fieldName.toLowerCase().includes("vault");
}

function isSourceLikeCorpus(corpus: string, fieldName: string): boolean {
  if (/source|file|文件|源/.test(corpus)) {
    return true;
  }
  const lower = fieldName.toLowerCase();
  return lower.includes("source") || lower.includes("file");
}

function hasSingleFilePathConstraint(fields: FieldInfo[]): boolean {
  const pathFields = fields.filter((field) => field.pathLike);
  return pathFields.some((field) => field.sourceLike);
}

function extractLiterals(text: string): ExtractedLiteral[] {
  const literals: ExtractedLiteral[] = [];
  const patterns: Array<{ kind: ExtractedLiteral["kind"]; regex: RegExp }> = [
    { kind: "string", regex: /"([^"]+)"/g },
    { kind: "string", regex: /'([^']+)'/g },
    { kind: "url", regex: /\bhttps?:\/\/[^\s]+/gi },
    { kind: "path", regex: /\\\\[^\s\\]+(?:\\[^\s]+)*/g },
    { kind: "path", regex: /[A-Za-z]:[\\/][^\s]+/g },
    {
      kind: "path",
      regex: /(?:\.\.?\/|\/)[^\s]+/g
    },
    { kind: "number", regex: /\b-?\d+\.\d+\b/g },
    { kind: "integer", regex: /\b-?\d+\b/g },
    { kind: "boolean", regex: /\b(true|false|yes|no|on|off)\b/gi }
  ];

  const occupied: Array<{ start: number; end: number }> = [];
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const raw = match[0];
      const start = match.index;
      const end = start + raw.length;
      if (occupied.some((range) => overlaps(range, { start, end }))) {
        continue;
      }

      let value: string | number | boolean = raw;
      if (pattern.kind === "string") {
        value = trimTrailingPunctuation(match[1] ?? raw);
      } else if (pattern.kind === "path" || pattern.kind === "url") {
        value = trimTrailingPunctuation(raw);
      } else if (pattern.kind === "number") {
        value = Number.parseFloat(raw);
      } else if (pattern.kind === "integer") {
        value = Number.parseInt(raw, 10);
      } else if (pattern.kind === "boolean") {
        value = parseBooleanWord(raw);
      }

      literals.push({ kind: pattern.kind, value, start, end });
      occupied.push({ start, end });
    }
  }

  return literals.sort((left, right) => left.start - right.start);
}

function overlaps(
  left: { start: number; end: number },
  right: { start: number; end: number }
): boolean {
  return left.start < right.end && right.start < left.end;
}

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[,.;:，。；：)\]}>]+$/u, "").trim();
}

function parseBooleanWord(word: string): boolean {
  const normalized = normalizeText(word);
  return ["true", "yes", "on", "是", "开启", "启用"].includes(normalized);
}

function assignFields(
  text: string,
  fields: FieldInfo[],
  literals: ExtractedLiteral[]
): AssignmentResult {
  const prefilled_args: Record<string, unknown> = {};
  const ambiguous_fields: string[] = [];
  const usedLiterals = new Set<number>();

  assignEnums(text, fields, prefilled_args);

  const pathLiterals = literals
    .map((literal, index) => ({ literal, index }))
    .filter((entry) => entry.literal.kind === "path");
  if (pathLiterals.length > 0) {
    assignPaths(text, fields, pathLiterals, prefilled_args, ambiguous_fields, usedLiterals);
  }

  for (const field of fields) {
    if (prefilled_args[field.name] !== undefined) continue;
    if (field.type === "boolean") {
      assignBooleanField(text, field, literals, prefilled_args, ambiguous_fields, usedLiterals);
      continue;
    }
    assignScalarField(
      text,
      field,
      fields,
      literals,
      prefilled_args,
      ambiguous_fields,
      usedLiterals
    );
  }

  return { prefilled_args, ambiguous_fields };
}

function assignEnums(
  text: string,
  fields: FieldInfo[],
  prefilled_args: Record<string, unknown>
): void {
  const normalized = normalizeText(text);
  for (const field of fields) {
    if (!field.enumValues || prefilled_args[field.name] !== undefined) continue;
    const matches = field.enumValues.filter((value) =>
      normalized.includes(normalizeText(String(value)))
    );
    if (matches.length === 1) {
      prefilled_args[field.name] = matches[0];
    }
  }
}

function assignPaths(
  text: string,
  fields: FieldInfo[],
  pathLiterals: Array<{ literal: ExtractedLiteral; index: number }>,
  prefilled_args: Record<string, unknown>,
  ambiguous_fields: string[],
  usedLiterals: Set<number>
): void {
  const pathFields = fields.filter((field) => field.pathLike);
  if (pathFields.length === 0) return;

  const importIntent = detectImportIntent(text);
  const vaultIntent = detectVaultCheckIntent(text);

  if (pathLiterals.length === 1) {
    const entry = pathLiterals[0]!;
    const target = pickSinglePathField(pathFields, importIntent, vaultIntent);
    if (!target) {
      ambiguous_fields.push("path");
      return;
    }
    prefilled_args[target.name] = entry.literal.value;
    usedLiterals.add(entry.index);
    return;
  }

  if (pathLiterals.length === 2) {
    const vaultField = pathFields.find((field) => field.vaultLike);
    const sourceField = pathFields.find((field) => field.sourceLike);
    if (!vaultField || !sourceField) {
      ambiguous_fields.push("path");
      return;
    }

    let vaultLiteral: (typeof pathLiterals)[number] | undefined;
    let sourceLiteral: (typeof pathLiterals)[number] | undefined;
    for (const entry of pathLiterals) {
      const nearField = uniquePathFieldNear(text, entry.literal.start, pathFields);
      if (nearField === vaultField) {
        if (vaultLiteral) {
          ambiguous_fields.push(vaultField.name);
          return;
        }
        vaultLiteral = entry;
      } else if (nearField === sourceField) {
        if (sourceLiteral) {
          ambiguous_fields.push(sourceField.name);
          return;
        }
        sourceLiteral = entry;
      }
    }

    if (!vaultLiteral || !sourceLiteral || vaultLiteral === sourceLiteral) {
      ambiguous_fields.push("path");
      return;
    }

    prefilled_args[vaultField.name] = vaultLiteral.literal.value;
    prefilled_args[sourceField.name] = sourceLiteral.literal.value;
    usedLiterals.add(vaultLiteral.index);
    usedLiterals.add(sourceLiteral.index);
    return;
  }

  ambiguous_fields.push("path");
}

function pickSinglePathField(
  pathFields: FieldInfo[],
  importIntent: boolean,
  vaultIntent: boolean
): FieldInfo | undefined {
  if (importIntent && !vaultIntent) {
    return pathFields.find((field) => field.sourceLike) ?? pathFields[0];
  }
  if (vaultIntent && !importIntent) {
    return pathFields.find((field) => field.vaultLike) ?? pathFields[0];
  }
  if (pathFields.length === 1) {
    return pathFields[0];
  }
  return undefined;
}

function assignBooleanField(
  text: string,
  field: FieldInfo,
  literals: ExtractedLiteral[],
  prefilled_args: Record<string, unknown>,
  ambiguous_fields: string[],
  usedLiterals: Set<number>
): void {
  const booleanLiterals = literals
    .map((literal, index) => ({ literal, index }))
    .filter((entry) => entry.literal.kind === "boolean" && !usedLiterals.has(entry.index));

  const candidates = booleanLiterals.map((entry) => ({
    value: entry.literal.value as boolean,
    index: entry.index
  }));
  if (candidates.length === 0) {
    const localized = findLocalizedBooleanNearHints(text, field.hints);
    if (localized !== undefined) {
      candidates.push({ value: localized, index: -1 });
    }
  }

  if (candidates.length === 1) {
    prefilled_args[field.name] = candidates[0]!.value;
    if (candidates[0]!.index >= 0) usedLiterals.add(candidates[0]!.index);
    return;
  }
  if (candidates.length > 1) {
    ambiguous_fields.push(field.name);
  }
}

function findLocalizedBooleanNearHints(text: string, hints: string[]): boolean | undefined {
  const positive = ["是", "开启", "启用", "yes", "true", "on"];
  const negative = ["否", "关闭", "停用", "no", "false", "off"];
  for (let index = 0; index < text.length; index += 1) {
    const window = text.slice(Math.max(0, index - NEARBY_HINT_RADIUS), index + NEARBY_HINT_RADIUS);
    const normalizedWindow = normalizeText(window);
    if (!hints.some((hint) => hint && normalizedWindow.includes(hint))) continue;
    const hasPositive = positive.some((word) => normalizedWindow.includes(word));
    const hasNegative = negative.some((word) => normalizedWindow.includes(word));
    if (hasPositive && hasNegative) return undefined;
    if (hasPositive) return true;
    if (hasNegative) return false;
  }
  return undefined;
}

function assignScalarField(
  text: string,
  field: FieldInfo,
  allFields: FieldInfo[],
  literals: ExtractedLiteral[],
  prefilled_args: Record<string, unknown>,
  ambiguous_fields: string[],
  usedLiterals: Set<number>
): void {
  const compatible = literals
    .map((literal, index) => ({ literal, index }))
    .filter((entry) => !usedLiterals.has(entry.index) && literalMatchesField(entry.literal, field));

  if (compatible.length === 1) {
    prefilled_args[field.name] = compatible[0]!.literal.value;
    usedLiterals.add(compatible[0]!.index);
    return;
  }

  if (compatible.length === 0) return;

  const uniquelyHinted = compatible.filter(
    (entry) => uniqueFieldNear(text, entry.literal.start, allFields) === field
  );
  if (uniquelyHinted.length === 1) {
    prefilled_args[field.name] = uniquelyHinted[0]!.literal.value;
    usedLiterals.add(uniquelyHinted[0]!.index);
    return;
  }

  ambiguous_fields.push(field.name);
}

function literalMatchesField(literal: ExtractedLiteral, field: FieldInfo): boolean {
  switch (field.type) {
    case "string":
      return literal.kind === "string" || literal.kind === "url";
    case "number":
      return literal.kind === "number";
    case "integer":
      return literal.kind === "integer";
    case "boolean":
      return literal.kind === "boolean";
    default:
      return false;
  }
}

function fieldHintsMatchNear(text: string, literalStart: number, hints: string[]): boolean {
  const windowStart = Math.max(0, literalStart - NEARBY_HINT_RADIUS);
  const windowEnd = Math.min(text.length, literalStart + NEARBY_HINT_RADIUS);
  const window = normalizeText(text.slice(windowStart, windowEnd));
  return hints.some((hint) => hint.length > 0 && window.includes(hint));
}

function uniqueFieldNear(
  text: string,
  literalStart: number,
  fields: FieldInfo[]
): FieldInfo | undefined {
  const matches = fields.filter((field) => fieldHintsMatchNear(text, literalStart, field.hints));
  return matches.length === 1 ? matches[0] : undefined;
}

function uniquePathFieldNear(
  text: string,
  literalStart: number,
  fields: FieldInfo[]
): FieldInfo | undefined {
  const matches = fields.filter((field) => pathHintsMatchNear(text, literalStart, field.hints));
  return matches.length === 1 ? matches[0] : undefined;
}

function pathHintsMatchNear(text: string, literalStart: number, hints: string[]): boolean {
  const window = normalizeText(
    text.slice(Math.max(0, literalStart - PATH_HINT_LOOKBACK), literalStart)
  );
  return hints.some((hint) => hint.length > 0 && window.includes(hint));
}

function detectImportIntent(text: string): boolean {
  const normalized = normalizeText(text);
  return /\b(import|ingest|upload)\b/.test(normalized) || normalized.includes("导入");
}

function detectVaultCheckIntent(text: string): boolean {
  const normalized = normalizeText(text);
  return (
    /\b(check|doctor|status|scan|verify|vault)\b/.test(normalized) ||
    normalized.includes("检查") ||
    normalized.includes("诊断")
  );
}
