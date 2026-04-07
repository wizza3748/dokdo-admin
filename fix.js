const fs = require('fs');
const path = require('path');
const p = path.resolve('d:/wizza_work/Dokdo-admin/src/app/admin/exploration/send-status/page.tsx');
let code = fs.readFileSync(p, 'utf8');

const MOCK_START = code.indexOf('const MOCK_RECORDS: SendRecord[] = [');
const MOCK_END = code.indexOf('// 발송 가능 여부 판단');

if (MOCK_START !== -1 && MOCK_END !== -1) {
  let mockPart = code.substring(MOCK_START, MOCK_END);
  
  mockPart = mockPart.replace(/studyType: \"책 읽기\"/g, 'studyType: [\"책 읽기\"]');
  mockPart = mockPart.replace(/studyType: \"글쓰기\"/g, 'studyType: [\"글쓰기\"]');
  
  mockPart = mockPart.replace(/studyType: \[\"책 읽기\"\], level: 3, firstCount: 2, retryCount: 0/g, 'studyType: [\"책 읽기\", \"글쓰기\"], level: 3, firstCount: 2, retryCount: 0');
  mockPart = mockPart.replace(/studyType: \[\"글쓰기\"\], level: 4, firstCount: 1, retryCount: 1/g, 'studyType: [\"글쓰기\", \"책 읽기\"], level: 4, firstCount: 1, retryCount: 1');

  code = code.substring(0, MOCK_START) + mockPart + code.substring(MOCK_END);
  fs.writeFileSync(p, code, 'utf8');
  console.log('Successfully updated mock data.');
} else {
  console.log('Could not find mock data block.');
}
