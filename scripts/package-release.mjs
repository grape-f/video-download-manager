import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function parseArgs(argv) {
  const args = {
    platform: 'win-x64',
    out: 'release',
    node: null,
    ytdlp: null,
    ffmpegDir: null,
    nodeModules: path.join(projectRoot, 'node_modules'),
    skipBuild: false,
    skipNodeModules: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    switch (key) {
      case '--platform':
        args.platform = value;
        i += 1;
        break;
      case '--out':
        args.out = value;
        i += 1;
        break;
      case '--node':
        args.node = value;
        i += 1;
        break;
      case '--ytdlp':
        args.ytdlp = value;
        i += 1;
        break;
      case '--ffmpeg-dir':
        args.ffmpegDir = value;
        i += 1;
        break;
      case '--node-modules':
        args.nodeModules = value;
        i += 1;
        break;
      case '--skip-build':
        args.skipBuild = true;
        break;
      case '--skip-node-modules':
        args.skipNodeModules = true;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }

  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function requirePath(target, label) {
  if (!target || !fs.existsSync(target)) {
    throw new Error(`${label} not found: ${target}`);
  }
}

function copyInto(bundleDir, relativePath, source) {
  const target = path.join(bundleDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.statSync(source).isDirectory()) {
    fs.cpSync(source, target, { recursive: true, dereference: true });
  } else {
    fs.copyFileSync(source, target);
  }
}

const args = parseArgs(process.argv.slice(2));
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const bundleName = `video-download-manager-${version}-${args.platform}`;
const outDir = path.resolve(projectRoot, args.out);
const bundleDir = path.join(outDir, bundleName);
const isWindows = args.platform.startsWith('win');

requirePath(args.node, 'Node executable');
requirePath(args.ytdlp, 'yt-dlp executable');
requirePath(args.ffmpegDir, 'ffmpeg directory');
requirePath(path.join(projectRoot, 'server', 'dist'), 'server/dist (run npm run build first)');
requirePath(path.join(projectRoot, 'web', 'dist'), 'web/dist (run npm run build first)');

if (!args.skipBuild) {
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
}

fs.mkdirSync(outDir, { recursive: true });
const resolvedBundle = path.resolve(bundleDir);
if (!resolvedBundle.startsWith(path.resolve(outDir) + path.sep)) {
  throw new Error(`Refusing to clean unexpected bundle path: ${resolvedBundle}`);
}
fs.rmSync(resolvedBundle, { recursive: true, force: true });
fs.mkdirSync(resolvedBundle, { recursive: true });

// Node runtime
const nodeTarget = isWindows ? 'node/node.exe' : 'node/bin/node';
copyInto(resolvedBundle, nodeTarget, args.node);

// yt-dlp
copyInto(resolvedBundle, isWindows ? 'bin/yt-dlp.exe' : 'bin/yt-dlp', args.ytdlp);

// ffmpeg + ffprobe + license files
const ffmpegNames = isWindows ? ['ffmpeg.exe', 'ffprobe.exe'] : ['ffmpeg', 'ffprobe'];
for (const name of ffmpegNames) {
  const source = path.join(args.ffmpegDir, name);
  requirePath(source, `ffmpeg binary (${name})`);
  copyInto(resolvedBundle, `bin/ffmpeg/${name}`, source);
}
for (const candidate of [
  path.join(args.ffmpegDir, 'LICENSE.txt'),
  path.join(path.dirname(args.ffmpegDir), 'LICENSE.txt'),
  path.join(args.ffmpegDir, 'LICENSE'),
  path.join(path.dirname(args.ffmpegDir), 'LICENSE'),
  path.join(args.ffmpegDir, 'COPYING'),
  path.join(path.dirname(args.ffmpegDir), 'COPYING'),
]) {
  if (fs.existsSync(candidate)) {
    copyInto(resolvedBundle, path.join('bin', 'ffmpeg', path.basename(candidate)), candidate);
  }
}

// App build output
copyInto(resolvedBundle, 'server/dist', path.join(projectRoot, 'server', 'dist'));
copyInto(resolvedBundle, 'web/dist', path.join(projectRoot, 'web', 'dist'));
copyInto(resolvedBundle, 'browser-extension', path.join(projectRoot, 'browser-extension'));

// Docs and launchers
for (const file of ['.env.example', 'README.md', 'LICENSE']) {
  const source = path.join(projectRoot, file);
  if (fs.existsSync(source)) {
    copyInto(resolvedBundle, file, source);
  }
}
copyInto(resolvedBundle, 'start.bat', path.join(projectRoot, 'packaging', 'start.bat'));
copyInto(resolvedBundle, 'README-Windows.txt', path.join(projectRoot, 'packaging', 'README-Windows.txt'));

// Production dependencies
if (!args.skipNodeModules) {
  requirePath(args.nodeModules, 'node_modules');
  const nodeModulesTarget = path.join(resolvedBundle, 'node_modules');
  fs.mkdirSync(nodeModulesTarget, { recursive: true });
  fs.cpSync(args.nodeModules, nodeModulesTarget, {
    recursive: true,
    dereference: true,
    filter: (source) => {
      const relative = path.relative(args.nodeModules, source);
      if (!relative) return true;
      const first = relative.split(path.sep)[0];
      return first !== 'server' && first !== 'web' && first !== '.bin';
    },
  });
}

fs.writeFileSync(path.join(resolvedBundle, 'version.txt'), `${version}\n`, 'utf8');

const archivePath = path.join(
  outDir,
  isWindows ? `${bundleName}.zip` : `${bundleName}.tar.gz`,
);
fs.rmSync(archivePath, { force: true });
if (isWindows) {
  run('tar', ['-a', '-c', '-f', archivePath, '-C', outDir, bundleName]);
} else {
  run('tar', ['-czf', archivePath, '-C', outDir, bundleName]);
}

const stat = fs.statSync(archivePath);
console.log('');
console.log(`Package: ${archivePath}`);
console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
