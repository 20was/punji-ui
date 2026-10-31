export const utilityPages = [
  { path: '/utilities/financial-formatters', title: 'Financial formatters', summary: 'NPR, Nepali digits, exact minor-unit amounts and reusable formatters.', aliases: ['money', 'paisa', 'formatMinorUnits', 'createFinancialFormatters', 'formatChange', 'formatBasisPoints', 'formatPrice', 'formatQuantity'], view: 'FinancialFormattersPage' },
  { path: '/utilities/decimal-input', title: 'Decimal input and exact money', summary: 'Validate English and Nepali input, parse and sum exact minor units.', aliases: ['parse', 'Devanagari', 'parseLocalizedDecimal', 'parseMinorUnits'], view: 'DecimalInputPage' },
  { path: '/utilities/calendar-dates', title: 'Calendar dates and ranges', summary: 'Strict Gregorian date-only parsing and formatting without timezone shifts.', aliases: ['parseCalendarDate', 'formatCalendarDate', 'formatDateRange', 'leap year'], view: 'CalendarDatesPage' },
  { path: '/utilities/nepal-calendar', title: 'Nepal calendar and fiscal years', summary: 'BS conversion, Nepali months, Kathmandu instants and complete fiscal periods.', aliases: ['Bikram Sambat', 'fiscal', 'getNepalFiscalPeriod', 'gregorianToBS'], view: 'NepalCalendarPage' },
  { path: '/utilities/react-hooks', title: 'Reusable React hooks', summary: 'Media queries, hydration and stable ordering for live financial rows.', aliases: ['useMediaQuery', 'useHydrated', 'useStableOrder', 'keepOrder'], view: 'UtilityHooksPage' },
].map(page => ({ ...page, group: 'Utilities', sections: [{ id:'examples',title:'Working examples' }, { id:'api',title:'API reference' }, { id:'contracts',title:'Behaviour and edge cases' }] }));

export const calendarPages = [
  {path:'/components/date-picker',title:'Date picker and ranges',group:'Inputs',summary:'Typed dates, modal calendars, Gregorian and Bikram Sambat input, reporting ranges.',aliases:['DatePicker','DateRangePicker','date input','BS','AD'],view:'DatePickerComponentPage'},
  {path:'/components/calendar',title:'Calendar',group:'Inputs',summary:'Single, range and multiple dates; keyboard navigation, availability and Nepali calendars.',aliases:['calendar','multiple dates','range','Bikram Sambat'],view:'CalendarComponentPage'},
].map(page=>({...page,sections:[{id:'examples',title:'Working examples'},{id:'api',title:'API reference'},{id:'contracts',title:'Behaviour and edge cases'}]}));
