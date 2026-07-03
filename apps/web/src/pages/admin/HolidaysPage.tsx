import React, { useState, useMemo } from 'react';
import { useHolidays, useCreateHoliday, useDeleteHoliday, useBulkUploadHoliday } from '../../api/hooks';
import toast from 'react-hot-toast';
import { CaretLeft, CaretRight, Trash, Plus, UploadSimple, CalendarBlank, X, ArrowLeft } from '@phosphor-icons/react';
import ConfirmDialog from '../../components/ConfirmDialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ── Holiday color palette ── */
const HOLIDAY_COLORS = [
  { bg: 'bg-rose-500',    bgLight: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',  dot: 'bg-rose-400' },
  { bg: 'bg-amber-500',   bgLight: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400' },
  { bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-blue-500',    bgLight: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-400' },
  { bg: 'bg-violet-500',  bgLight: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
  { bg: 'bg-pink-500',    bgLight: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',  dot: 'bg-pink-400' },
  { bg: 'bg-teal-500',    bgLight: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-400' },
  { bg: 'bg-orange-500',  bgLight: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  { bg: 'bg-cyan-500',    bgLight: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',  dot: 'bg-cyan-400' },
  { bg: 'bg-indigo-500',  bgLight: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400' },
];

function getHolidayColor(index: number) {
  return HOLIDAY_COLORS[index % HOLIDAY_COLORS.length];
}

export default function HolidaysPage() {
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  const { data: apiHolidays = [], isLoading } = useHolidays(year);
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const bulkUpload = useBulkUploadHoliday();

  /* Show only real holidays from the database (matches the WhatsApp PDF). */
  const holidays = useMemo(() => {
    return [...apiHolidays].sort((a, b) => a.date.localeCompare(b.date));
  }, [apiHolidays]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ id: string; name: string } | null>(null);

  /* Build a color map: each unique holiday name gets a stable color */
  const holidayColorMap = useMemo(() => {
    const nameSet = new Set(holidays.map(h => h.name));
    const map = new Map<string, typeof HOLIDAY_COLORS[0]>();
    let idx = 0;
    nameSet.forEach(name => {
      map.set(name, getHolidayColor(idx));
      idx++;
    });
    return map;
  }, [holidays]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay();

  const handlePrevYear = () => {
    setCurrentDate(new Date(year - 1, month - 1, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(year + 1, month - 1, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = holidays.find(h => h.date === dateStr);
    
    if (existing) {
      setHolidayToDelete({ id: existing.id, name: existing.name });
    } else {
      setSelectedDate(dateStr);
      setHolidayName('');
      setIsModalOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (!holidayToDelete) return;
    deleteHoliday.mutate(holidayToDelete.id, {
      onSuccess: () => {
        toast.success('Holiday removed');
        setHolidayToDelete(null);
      }
    });
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !holidayName.trim()) return;

    createHoliday.mutate({ date: selectedDate, name: holidayName }, {
      onSuccess: () => {
        toast.success('Holiday added');
        setIsModalOpen(false);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.promise(
      bulkUpload.mutateAsync(file),
      {
        loading: 'Uploading holidays...',
        success: (data) => `Successfully imported ${data.imported} holidays!`,
        error: 'Failed to upload holidays'
      }
    ).finally(() => {
      e.target.value = '';
    });
  };

  /* ── Year overview: tiles show only holiday list, no calendar dates ── */
  const renderYearView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {MONTHS.map((monthName, idx) => {
        const m = idx + 1;
        const monthHolidays = holidays.filter(h => {
          const [, hMonth] = h.date.split('-');
          return parseInt(hMonth, 10) === m;
        });

        return (
          <div 
            key={monthName}
            onClick={() => {
              setCurrentDate(new Date(year, idx, 1));
              setViewMode('month');
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer overflow-hidden group flex flex-col"
          >
            {/* Month header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-semibold text-slate-800 text-sm">{monthName}</h3>
              {monthHolidays.length > 0 ? (
                <span className="text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-full">
                  {monthHolidays.length}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  0
                </span>
              )}
            </div>

            {/* Holiday list */}
            <div className="px-4 py-3 flex-1 flex flex-col gap-1.5 min-h-[120px]">
              {monthHolidays.length > 0 ? (
                <>
                  {monthHolidays.slice(0, 4).map(h => {
                    const day = parseInt(h.date.split('-')[2], 10);
                    const color = holidayColorMap.get(h.name);
                    const dateObj = new Date(year, idx, day);
                    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <div key={h.id} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md ${color?.bgLight || 'bg-slate-50'} border ${color?.border || 'border-slate-100'}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color?.dot || 'bg-slate-400'}`} />
                        <span className={`text-[11px] font-bold flex-shrink-0 ${color?.text || 'text-slate-600'}`}>
                          {weekday} {day}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate">{h.name}</span>
                      </div>
                    );
                  })}
                  {monthHolidays.length > 4 && (
                    <span className="text-[10px] font-semibold text-indigo-500 pl-2 mt-0.5">
                      +{monthHolidays.length - 4} more
                    </span>
                  )}
                </>
              ) : (
                <div className="text-slate-400 text-xs flex items-center justify-center h-full">
                  No holidays
                </div>
              )}
            </div>

            {/* Hover CTA */}
            <div className="bg-slate-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
              Open Calendar
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Month detail view with full calendar grid ── */
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthHolidays = holidays.filter(h => {
      const [, hMonth] = h.date.split('-');
      return parseInt(hMonth, 10) === month;
    });

    return (
      <div className="space-y-6">
        {/* Calendar grid */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAYS.map(day => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[120px]">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="border-b border-r border-slate-100 bg-slate-50/50" />
            ))}
            {days.map(day => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const holiday = holidays.find(h => h.date === dateStr);
              const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
              const color = holiday ? holidayColorMap.get(holiday.name) : null;

              const today = new Date();
              const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;

              return (
                <div 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`border-b border-r border-slate-100 p-2 cursor-pointer transition-all relative group
                    ${holiday && color ? `${color.bgLight} hover:brightness-95` : 'hover:bg-slate-50'}
                    ${isWeekend && !holiday ? 'bg-slate-50/50' : ''}
                  `}
                >
                  <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full
                    ${isToday ? 'bg-slate-900 text-white' : ''}
                    ${holiday && color && !isToday ? `${color.text} font-bold` : ''}
                    ${!holiday && !isToday ? 'text-slate-700' : ''}
                  `}>
                    {day}
                  </span>
                  
                  {holiday && color && (
                    <div className={`mt-1 text-xs font-semibold ${color.bg} text-white p-1.5 rounded truncate`}>
                      {holiday.name}
                    </div>
                  )}

                  {holiday && color && (
                    <div className={`absolute top-0 left-0 w-1 h-full ${color.bg}`} />
                  )}

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {holiday ? (
                      <Trash className="w-4 h-4 text-red-500" weight="fill" />
                    ) : (
                      <Plus className="w-4 h-4 text-indigo-400" weight="bold" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color-coded holiday legend */}
        {monthHolidays.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Holidays in {MONTHS[month - 1]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthHolidays.map(h => {
                const day = parseInt(h.date.split('-')[2], 10);
                const color = holidayColorMap.get(h.name);
                const dateObj = new Date(year, month - 1, day);
                const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div
                    key={h.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${color?.border || 'border-slate-200'} ${color?.bgLight || 'bg-slate-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${color?.bg || 'bg-slate-500'} text-white flex flex-col items-center justify-center flex-shrink-0`}>
                      <span className="text-[10px] font-semibold leading-none uppercase">{weekday}</span>
                      <span className="text-sm font-bold leading-tight">{day}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${color?.text || 'text-slate-700'}`}>{h.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {viewMode === 'month' && (
            <button 
              onClick={() => setViewMode('year')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Holiday Calendar</h1>
            <p className="text-sm text-slate-500">{viewMode === 'year' ? 'Year Overview' : 'Month Detail'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors">
            <UploadSimple className="w-4 h-4" />
            <span>Import Excel</span>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={bulkUpload.isPending}
            />
          </label>
          <div className="h-6 w-px bg-slate-200"></div>
          
          {viewMode === 'year' ? (
            <>
              <button onClick={handlePrevYear} className="p-2 hover:bg-slate-100 rounded-lg">
                <CaretLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-lg font-medium w-24 text-center">{year}</span>
              <button onClick={handleNextYear} className="p-2 hover:bg-slate-100 rounded-lg">
                <CaretRight className="w-5 h-5 text-slate-600" />
              </button>
            </>
          ) : (
            <>
              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <CaretLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-lg font-medium w-40 text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <CaretRight className="w-5 h-5 text-slate-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading calendar...</div>
      ) : (
        viewMode === 'year' ? renderYearView() : renderMonthView()
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-10 bg-white border border-slate-300 shadow-2xl w-full max-w-md mx-4">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <CalendarBlank size={20} className="text-slate-500" weight="fill" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Mark Holiday
                </span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-slate-500 mb-6">
                Adding a holiday for <strong className="text-slate-700 font-semibold">{selectedDate}</strong>.
              </p>
              <form id="holiday-form" onSubmit={handleSaveHoliday}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full bg-white border border-slate-300 text-sm rounded-none px-3 py-2.5 text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all placeholder-slate-400"
                    value={holidayName}
                    onChange={e => setHolidayName(e.target.value)}
                    placeholder="e.g. Independence Day"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="holiday-form"
                disabled={createHoliday.isPending}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer bg-slate-800 hover:bg-slate-900 border border-slate-900"
              >
                {createHoliday.isPending ? 'Saving...' : 'Save Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!holidayToDelete}
        title="Delete Holiday"
        message={`Are you sure you want to remove "${holidayToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setHolidayToDelete(null)}
        danger
      />
    </div>
  );
}
