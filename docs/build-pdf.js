const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mdArg = process.argv[2];
const pdfArg = process.argv[3];
const mdBase = mdArg ? path.basename(mdArg, path.extname(mdArg)) : 'getting-started-simple';
const mdPath = mdArg ? path.resolve(mdArg) : path.join(__dirname, 'getting-started-simple.md');
const cssPath = path.join(__dirname, 'pdf-styles.css');
const htmlPath = path.join(__dirname, `${mdBase}.html`);
const pdfPath = pdfArg
  ? path.resolve(pdfArg)
  : 'E:\\PayslipPortal-How-To-Run.pdf';
const docTitle = mdBase.includes('hosting')
  ? 'Nippon Toyota Payslip Portal: How to Host Online'
  : 'Nippon Toyota Payslip Portal: How to Run Everything';

const md = fs.readFileSync(mdPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function mdToHtml(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(inlineFormat(lines[i].slice(2)));
        i++;
      }
      out.push(`<blockquote><p>${quote.join('<br>')}</p></blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1])) {
      const rows = [];
      rows.push(line);
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i]);
        i++;
      }
      const cells = rows.map((row) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim()),
      );
      const [header, ...body] = cells;
      out.push('<table>');
      out.push('<thead><tr>' + header.map((h) => `<th>${inlineFormat(h)}</th>`).join('') + '</tr></thead>');
      out.push('<tbody>');
      for (const row of body) {
        out.push('<tr>' + row.map((c) => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table>');
      continue;
    }

    if (/^[-*] /.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        out.push(`<li>${inlineFormat(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    if (/^\d+\. /.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        out.push(`<li>${inlineFormat(lines[i].replace(/^\d+\.\s*/, ''))}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    out.push(`<p>${inlineFormat(line)}</p>`);
    i++;
  }

  return out.join('\n');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>${css}</style>
</head>
<body>
${mdToHtml(md)}
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browser = chromeCandidates.find((p) => fs.existsSync(p));
if (!browser) {
  console.error('No Chrome or Edge found for PDF generation.');
  process.exit(1);
}

const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  fileUrl,
], { stdio: 'inherit' });

if (!fs.existsSync(pdfPath)) {
  console.error('PDF was not created.');
  process.exit(1);
}

const stats = fs.statSync(pdfPath);
console.log(`PDF created: ${pdfPath} (${stats.size} bytes)`);
