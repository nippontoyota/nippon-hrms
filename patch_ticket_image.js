const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = '<p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p></div></section>';

const newContent = `<p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p></div>
{ticket.image_url && (
  <div className="mt-5 min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Attached Image</p>
    <div className="mt-2 border border-slate-200 bg-white p-2 shadow-sm">
      <img src={ticket.image_url} alt="Ticket attachment" className="w-full h-auto object-contain max-h-[400px]" loading="lazy" />
    </div>
  </div>
)}
</section>`;

code = code.replace(target, newContent);

fs.writeFileSync(file, code);
