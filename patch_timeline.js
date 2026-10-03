const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetRegex = /<section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Activity<\/h2>.*?<\/section>/s;

const newSection = '<section className="border border-slate-200 bg-white p-5 shadow-sm">\n' +
'          <h2 className="text-lg font-bold text-slate-950">Activity Timeline</h2>\n' +
'          <div className="mt-6">\n' +
'            {ticket.activities.length === 0 && ticket.status_history.length === 0 && (\n' +
'              <p className="text-sm text-slate-700">No activity recorded yet.</p>\n' +
'            )}\n' +
'            <ul role="list" className="space-y-6">\n' +
'              {[...ticket.activities.map((item) => ({ id: item.id, date: item.created_at, title: item.detail, actor: item.actor })), ...ticket.status_history.map((item) => ({ id: item.id, date: item.created_at, title: `Status: ${item.status.replaceAll(\'_\', \' \')}`, actor: item.notes || \'System\' }))].sort((a, b) => b.date.getTime() - a.date.getTime()).map((item, index, arr) => {\n' +
'                const isCuid = item.actor?.length === 25 && item.actor?.startsWith(\'c\');\n' +
'                const displayActor = isCuid ? \'Staff Member\' : (item.actor || \'System\');\n' +
'                const isLast = index === arr.length - 1;\n' +
'                return (\n' +
'                  <li key={item.id} className="relative flex gap-x-4">\n' +
'                    <div className={`absolute left-0 top-0 flex w-6 justify-center ${isLast ? \'h-6\' : \'-bottom-6\'}`}>\n' +
'                      <div className="w-px bg-emerald-200" />\n' +
'                    </div>\n' +
'                    <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">\n' +
'                      <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />\n' +
'                    </div>\n' +
'                    <div className="flex-auto py-0.5">\n' +
'                      <p className="break-words text-sm font-semibold text-slate-800">{item.title}</p>\n' +
'                      <p className="mt-1 break-words text-xs font-medium text-slate-500">\n' +
'                        {format(item.date, \'dd MMM, h:mm a\')} · {displayActor}\n' +
'                      </p>\n' +
'                    </div>\n' +
'                  </li>\n' +
'                )\n' +
'              })}\n' +
'            </ul>\n' +
'          </div>\n' +
'        </section>';

code = code.replace(targetRegex, newSection);
fs.writeFileSync(file, code);
