export const EVENT = {
  mandalName: 'Navyuvak Ganesh Utsav Mandal',
  locality: 'Mhada Colony',
  title: 'Ganesh Utsav 2026',
  invitationHeading: 'A heartfelt invitation to welcome Bappa',
  dateDisplay: '14 September 2026',
  timeDisplay: '6:00 PM',
  dateTimeISO: '2026-09-14T18:00:00+05:30',
  calendarStart: '20260914T180000',
  venueName: 'Sarvajanik Maidan',
  address: 'Mhada Colony, Electronic Zone Square, MIDC, Hingna Road, Nagpur 440016',
  coordinator: 'Mangesh Chandrakant Khadatkar',
  phoneDisplay: '88886 65536',
  phone: '+918888665536',
  logoPath: '/assets/navyuvak-mandal-2026.jpeg',
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Sarvajanik%20Maidan%2C%20Mhada%20Colony%2C%20Electronic%20Zone%20Square%2C%20MIDC%2C%20Hingna%20Road%2C%20Nagpur%20440016',
} as const;

const escapeCalendarText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

const addressName = (guestName: string) => guestName.replace(/^dear\s+/i, '');

export const buildInvitationSpeech = (guestName: string) =>
  `Ganpati Bappa Morya! Dear ${addressName(guestName)}, it gives us immense joy to invite you and your family to ${EVENT.title}, hosted by ${EVENT.mandalName}, ${EVENT.locality}. Please join us on ${EVENT.dateDisplay}, at ${EVENT.timeDisplay}. The celebration will be held at ${EVENT.venueName}, ${EVENT.address}. Your presence and blessings will make this celebration truly special. We look forward to welcoming you. Ganpati Bappa Morya!`;

export const buildCalendarFile = (guestName: string) => {
  const description = `Dear ${addressName(guestName)}, you and your family are cordially invited by ${EVENT.mandalName}, ${EVENT.locality}. Coordinator: ${EVENT.coordinator}, ${EVENT.phoneDisplay}.`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Navyuvak Ganesh Utsav Mandal//Ganesh Utsav 2026//EN',
    'BEGIN:VEVENT',
    'UID:ganesh-utsav-2026@navyuvak-mhada-colony',
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;TZID=Asia/Kolkata:${EVENT.calendarStart}`,
    `SUMMARY:${escapeCalendarText(EVENT.title)} - ${escapeCalendarText(EVENT.mandalName)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(`${EVENT.venueName}, ${EVENT.address}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

export const buildShareText = (guestName: string) =>
  `Ganpati Bappa Morya! Dear ${addressName(guestName)}, you and your family are invited to ${EVENT.title} by ${EVENT.mandalName}, ${EVENT.locality}, on ${EVENT.dateDisplay} at ${EVENT.timeDisplay}. Venue: ${EVENT.venueName}, ${EVENT.address}.`;
