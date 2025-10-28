import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  console.log('Building CommonJS bundle...');
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    outfile: 'dist/cjs/src/index.js',
    sourcemap: true,
    external: [], // Bundle all dependencies for CJS
  });

  // Add package.json to mark CJS directory as CommonJS
  fs.mkdirSync('dist/cjs', { recursive: true });
  fs.writeFileSync(
    'dist/cjs/package.json',
    JSON.stringify({ type: 'commonjs' }, null, 2)
  );

  console.log('Building ESM bundle...');
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: 'esm',
    outfile: 'dist/esm/src/index.js',
    sourcemap: true,
    external: [], // Bundle all dependencies for ESM too
  });

  // Generate types using TypeScript
  console.log('Generating TypeScript declarations...');
  const { execSync } = await import('child_process');
  execSync('tsc --emitDeclarationOnly --declaration --outDir dist/types', {
    stdio: 'inherit',
  });

  // Copy type declarations to both output directories
  const copyTypes = (source, destination) => {
    if (!fs.existsSync(source)) return;

    const files = fs.readdirSync(source);
    fs.mkdirSync(destination, { recursive: true });

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);

      if (fs.statSync(sourcePath).isDirectory()) {
        copyTypes(sourcePath, destPath);
      } else if (file.endsWith('.d.ts')) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  };

  copyTypes('dist/types/src', 'dist/esm/src');
  copyTypes('dist/types/src', 'dist/cjs/src');

  // Clean up temporary types directory
  fs.rmSync('dist/types', { recursive: true });

  console.log('Build complete!');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
