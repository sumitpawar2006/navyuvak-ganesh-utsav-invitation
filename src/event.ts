export const EVENT = {
  mandalName: 'नवयुवक गणेश उत्सव मंडळ',
  locality: 'म्हाडा कॉलनी',
  title: 'श्री गणेश दर्शन',
  invitationHeading: 'बाप्पाच्या दर्शनासाठी सस्नेह आमंत्रण',
  venueName: 'सार्वजनिक मैदान',
  address: 'म्हाडा कॉलनी, इलेक्ट्रॉनिक झोन चौक, एमआयडीसी, हिंगणा रोड, नागपूर – ४४००१६',
  president: 'मंगेश चंद्रकांत खडतकर',
  presidentMandalName: 'नवयुवक म्हाडा गणेश उत्सव मंडळ',
  phoneDisplay: '८८८८६६५५३६',
  phone: '+918888665536',
  developer: 'Sumit Pawar',
  developerPhoneDisplay: '9359549943',
  developerPhone: '+919359549943',
  logoPath: '/assets/navyuvak-mandal-2026.jpeg',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=21.103106%2C78.988185',
} as const;

const addressName = (guestName: string) => guestName.replace(/^प्रिय\s+/u, '');

export const buildInvitationSpeech = (guestName: string) =>
  `गणपती बाप्पा मोरया! प्रिय ${addressName(guestName)}, ${EVENT.mandalName}, ${EVENT.locality} येथे विराजमान गणरायाचे दर्शन व आशीर्वाद घेण्यासाठी आपणास व आपल्या परिवारास सस्नेह आमंत्रण। ${EVENT.venueName}, ${EVENT.address} येथे सहकुटुंब अवश्य या। आपल्या उपस्थितीने उत्सवाचा आनंद अधिक मंगलमय होईल। आपले मनःपूर्वक स्वागत आहे। गणपती बाप्पा मोरया!`;

export const buildShareText = (guestName: string) =>
  `गणपती बाप्पा मोरया! प्रिय ${addressName(guestName)}, ${EVENT.mandalName}, ${EVENT.locality} येथे विराजमान गणरायाचे दर्शन व आशीर्वाद घेण्यासाठी आपणास व आपल्या परिवारास सस्नेह आमंत्रण. दर्शन स्थळ: ${EVENT.venueName}, ${EVENT.address}. आपले मनःपूर्वक स्वागत आहे!`;
