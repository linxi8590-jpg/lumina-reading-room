import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const depsOnly = process.argv.includes('--deps-only');
const env = {
  ...readDotEnv(path.join(root, '.env')),
  ...process.env
};

const problems = [];

if (!depsOnly) {
  const required = ['LUMINA_CONNECTOR_TOKEN'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    problems.push(`Missing required env vars: ${missing.join(', ')}`);
  }
}

problems.push(...checkDependencies());

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  if (!depsOnly && problems.some((problem) => problem.startsWith('Missing required env vars'))) {
    console.error('Run: bash scripts/quickstart.sh');
  }
  if (problems.some((problem) => problem.includes('Dependencies are not installed') || problem.includes('Cannot resolve package'))) {
    console.error('Run: pnpm install');
  }
  process.exit(1);
}

if (depsOnly) {
  console.log('Lumina dependencies look installed.');
} else {
  console.log('Lumina environment and dependencies look ready.');
}

function checkDependencies() {
  const issues = [];
  if (!fs.existsSync(path.join(root, 'node_modules'))) {
    issues.push('Dependencies are not installed: node_modules is missing.');
    return issues;
  }

  const packages = [
    { name: 'jszip', from: 'apps/server' },
    { name: 'fast-xml-parser', from: 'apps/server' },
    { name: 'vite', from: 'apps/web' },
    { name: 'react', from: 'apps/web' }
  ];

  for (const item of packages) {
    const base = path.join(root, item.from, 'package.json');
    try {
      createRequire(base).resolve(item.name);
    } catch {
      issues.push(`Cannot resolve package "${item.name}" from ${item.from}.`);
    }
  }

  return issues;
}

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    result[match[1]] = stripQuotes(match[2].trim());
  }

  return result;
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
