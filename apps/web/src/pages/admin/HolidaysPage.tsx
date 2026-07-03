import React, { useState } from 'react';
import { useHolidays, useCreateHoliday, useDeleteHoliday, useBulkUploadHoliday } from '../../api/hooks';
import toast from 'react-hot-toast';
import { CaretLeft, CaretRight, Trash, Plus, UploadSimple, CalendarBlank, X, ArrowLeft } from '@phosphor-icons/react';
import ConfirmDialog from '../../components/ConfirmDialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HolidaysPage() {
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  // Always fetch the whole year's holidays for fast switching
  const { data: holidays = [], isLoading } = useHolidays(year);
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const bulkUpload = useBulkUploadHoliday();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ id: string; name: string } | null>(null);

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

  const renderYearView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer overflow-hidden group flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{monthName}</h3>
              <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-500">
                {monthHolidays.length} {monthHolidays.length === 1 ? 'holiday' : 'holidays'}
              </span>
            </div>
            <div className="p-5 h-32 flex flex-col gap-2 overflow-hidden relative flex-1">
              {monthHolidays.length > 0 ? (
                monthHolidays.slice(0, 3).map(h => {
                  const day = parseInt(h.date.split('-')[2], 10);
                  return (
                    <div key={h.id} className="flex items-start gap-2 text-sm">
                      <span className="font-semibold text-slate-700 min-w-[20px]">{day}</span>
                      <span className="text-slate-500 truncate">{h.name}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 text-sm flex items-center justify-center h-full">
                  No holidays
                </div>
              )}
              {monthHolidays.length > 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-2">
                  <span className="text-xs font-semibold text-indigo-600">+{monthHolidays.length - 3} more</span>
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-5 py-3 text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-t border-slate-100">
              View Calendar
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
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
            <div key={`blank-${b}`} className="border-b border-r border-slate-100 bg-slate-50" />
          ))}
          {days.map(day => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holiday = holidays.find(h => h.date === dateStr);
            const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`border-b border-r border-slate-100 p-2 cursor-pointer transition-all relative group
                  ${holiday ? 'bg-white hover:bg-slate-50 ring-2 ring-inset ring-slate-800' : 'hover:bg-slate-50'}
                  ${isWeekend && !holiday ? 'bg-slate-50/50' : ''}
                `}
              >
                <span className={`text-sm font-medium ${holiday ? 'text-slate-900' : 'text-slate-700'}`}>
                  {day}
                </span>
                
                {holiday && (
                  <div className="mt-2 text-xs font-semibold bg-slate-800 text-slate-100 p-1.5 rounded-sm truncate">
                    {holiday.name}
                  </div>
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
                You are adding a new holiday for <strong className="text-slate-700 font-semibold">{selectedDate}</strong>.
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
