/**
 * =====================================================================
 *  독립 실행형(standalone) 리플레이 대시보드 빌드 스크립트
 * =====================================================================
 *
 *  public/replay.html (대시보드 UI) 과 public/samples/sample-N.json (샘플 데이터)을
 *  하나의 HTML 파일로 합쳐, 서버 없이 브라우저에서 파일을 더블클릭만 해도
 *  동작하는 단일 파일을 만듭니다.
 *
 *  - 샘플 데이터는 window.__PLC_SAMPLES__ 로 인라인 주입 (fetch 불필요 → file:// 에서도 동작)
 *  - <!doctype html>, <html>, <head>, <body> 골격을 감싸 완전한 문서로 출력
 *  - 웹폰트(Google Fonts)는 온라인일 때만 적용되고, 오프라인이면 시스템 폰트로 대체됨
 *
 *  사용법
 *    npx tsx scripts/build-standalone.ts                 # public/samples/sample-500.json 사용
 *    npx tsx scripts/build-standalone.ts --sample 100    # sample-100.json 사용
 *    npx tsx scripts/build-standalone.ts --out ./dist/plc-replay.html
 *
 *  기본 출력: public/plc-replay-standalone.html
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';

/** --key value 형식의 CLI 인자 파서 */
function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const publicDir = path.resolve(__dirname, '..', 'public');
const sampleCount = arg('sample', '500');
const templatePath = path.join(publicDir, 'replay.html');
const samplePath = path.join(publicDir, 'samples', `sample-${sampleCount}.json`);
const outPath = path.resolve(arg('out', path.join(publicDir, 'plc-replay-standalone.html')));

if (!fs.existsSync(samplePath)) {
  console.error(`샘플 파일이 없습니다: ${samplePath}\n먼저 실행: npx tsx scripts/generate-samples.ts --count ${sampleCount}`);
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

// 대시보드 스크립트 블록 바로 앞에 데이터 주입 스크립트를 끼워 넣음
const marker = '<script>\n/**';
if (template.split(marker).length !== 2) {
  console.error('replay.html 에서 스크립트 삽입 위치(marker)를 찾지 못했습니다.');
  process.exit(1);
}
// </script> 문자열이 데이터에 섞여 있어도 스크립트가 조기 종료되지 않도록 이스케이프
const json = JSON.stringify(sample).replace(/<\//g, '<\\/');
const inject =
  `<script>\n/* 샘플 데이터 ${sample.meta.count}건 (인라인 주입, 생성 시각 ${sample.meta.generatedAt}) */\n` +
  `window.__PLC_SAMPLES__ = ${json};\n</script>\n` +
  marker;
let body = template.replace(marker, inject);

// replay.html 은 <title>/<meta>/<link> 로 시작하는 프래그먼트이므로, 그 헤더성 요소들을
// 본문에서 떼어내 <head> 로 옮겨 올바른 문서 구조를 만듭니다.
const headParts: string[] = [];
body = body.replace(/^(?:\s*<(?:title>[^<]*<\/title|meta\b[^>]*|link\b[^>]*)>\s*)+/, (m) => {
  headParts.push(m.trim());
  return '';
});

// 완전한 HTML 문서로 감싸기
const html =
  '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
  headParts.join('\n') + '\n' +
  '<meta name="generator" content="plc-gateway build-standalone">\n' +
  '</head>\n<body>\n' +
  body +
  '\n</body>\n</html>\n';

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`생성 완료: ${outPath} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, 샘플 ${sample.meta.count}건)`);
