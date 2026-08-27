export const EVENT = {
  mandalName: 'नवयुवक गणेश उत्सव मंडळ',
  locality: 'म्हाडा कॉलनी',
  title: 'गणेशोत्सव २०२६',
  invitationHeading: 'बाप्पाच्या स्वागताचे मनःपूर्वक आमंत्रण',
  dateDisplay: '१४ सप्टेंबर २०२६',
  timeDisplay: 'सायंकाळी ६:०० वाजता',
  dateTimeISO: '2026-09-14T18:00:00+05:30',
  calendarStart: '20260914T180000',
  venueName: 'सार्वजनिक मैदान',
  address: 'म्हाडा कॉलनी, इलेक्ट्रॉनिक झोन चौक, एमआयडीसी, हिंगणा रोड, नागपूर – ४४००१६',
  president: 'मंगेश चंद्रकांत खडतकर',
  presidentMandalName: 'नवयुवक म्हाडा गणेश उत्सव मंडळ',
  phoneDisplay: '८८८८६६५५३६',
  phone: '+918888665536',
  logoPath: '/assets/navyuvak-mandal-2026.jpeg',
  mapUrl: 'https://maps.app.goo.gl/3nfW9WqB54YpQb848',
} as const;

const escapeCalendarText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

const addressName = (guestName: string) => guestName.replace(/^प्रिय\s+/u, '');

export const buildInvitationSpeech = (guestName: string) =>
  `गणपती बाप्पा मोरया! प्रिय ${addressName(guestName)}, आपणास व आपल्या परिवारास ${EVENT.title} साठी आमंत्रित करताना आम्हाला अतिशय आनंद होत आहे। हा मंगल सोहळा ${EVENT.mandalName}, ${EVENT.locality} तर्फे आयोजित केला आहे। दिनांक चौदा सप्टेंबर, दोन हजार सव्वीस रोजी, सायंकाळी सहा वाजता, ${EVENT.venueName}, ${EVENT.address} येथे अवश्य उपस्थित राहावे। आपल्या उपस्थितीने आणि आशीर्वादाने हा उत्सव अधिक आनंदमय होईल। आपले मनःपूर्वक स्वागत आहे। गणपती बाप्पा मोरया!`;

export const buildCalendarFile = (guestName: string) => {
  const description = `प्रिय ${addressName(guestName)}, ${EVENT.mandalName}, ${EVENT.locality} तर्फे आपणास व आपल्या परिवारास मनःपूर्वक आमंत्रण. अध्यक्ष: ${EVENT.president}, ${EVENT.presidentMandalName}, ${EVENT.phoneDisplay}.`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Navyuvak Ganesh Utsav Mandal//Ganesh Utsav 2026//MR',
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
  `गणपती बाप्पा मोरया! प्रिय ${addressName(guestName)}, ${EVENT.mandalName}, ${EVENT.locality} तर्फे आपणास व आपल्या परिवारास ${EVENT.title} साठी मनःपूर्वक आमंत्रण. दिनांक ${EVENT.dateDisplay}, ${EVENT.timeDisplay}. स्थळ: ${EVENT.venueName}, ${EVENT.address}.`;
