/**
 * europeanAcademies.js
 * Real European youth academies and development programs by country.
 * These represent high-level development paths for young European players,
 * distinct from North American academies and specifically for players who
 * start in Europe.
 */
(function (Game) {
  Game.data = Game.data || {};

  const EUROPEAN_ACADEMIES = {
    SE: [
      'AIK Hockey Academy',
      'Färjestads BK Akademi',
      'HV71 Ungdomsakademi',
      'Luleå Hockey Academy',
      'Malmö Akademi',
      'Modo Hockey Akademi',
      'SHL Development Program'
    ],
    FI: [
      'HIFK Academy',
      'Ilves Hockey Academy',
      'Jokipojat Development Center',
      'Kärpät Development',
      'Liiga Youth Academy',
      'Tappara Hockey Academy'
    ],
    RU: [
      'CSKA Development Academy',
      'Dynamo Moscow Academy',
      'KHL Development Program',
      'Lokomotiv Youth Academy',
      'SKA Saint Petersburg Academy',
      'Spartak Development Center'
    ],
    CZ: [
      'Brno Hockey Academy',
      'Czech Republic Youth Development',
      'HC Sparta Prague Academy',
      'Kometa Brno Academy',
      'Oceláři Třinec Academy',
      'Pardubice Hockey School'
    ],
    SK: [
      'Slovak Hockey Development',
      'HK Nitra Academy',
      'HC Zlín Youth Program',
      'Zvolen Hockey Academy'
    ],
    CH: [
      'HC Davos Academy',
      'SC Bern Youth Development',
      'Swiss Hockey League Academy',
      'ZSC Lions Development Program',
      'Genève-Servette Youth Academy'
    ],
    DE: [
      'DEL Eisbären Berlin Academy',
      'Kölner Haie Development',
      'Munich Red Bull Academy',
      'German Hockey Development Program',
      'Mannheim Adler Academy'
    ],
    NO: [
      'Norwegian Hockey Academy',
      'Oslo Hockey Development',
      'SHL Norwegian Program',
      'Stavanger IK Academy'
    ],
    LV: [
      'Latvian Hockey Federation Academy',
      'Riga Dynamo Development',
      'Riga Stingers Youth Program'
    ],
    DK: [
      'Danish Hockey Union Academy',
      'Aalborg IK Youth Program',
      'Copenhagen Hockey Academy'
    ],
    JP: [
      'Japan Hockey League Academy',
      'Nippon Paper Cranes Development',
      'Tokyo Hockey Academy'
    ]
  };

  function getAcademy(countryCode) {
    if (!countryCode) return null;
    const isEuropean = Game.leagues && Game.leagues.leagueData && Game.leagues.leagueData.isEuropean
      ? Game.leagues.leagueData.isEuropean(countryCode)
      : Object.prototype.hasOwnProperty.call(EUROPEAN_ACADEMIES, countryCode);

    if (!isEuropean) return null;

    const list = EUROPEAN_ACADEMIES[countryCode] || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  Game.data.europeanAcademies = {
    ...EUROPEAN_ACADEMIES,
    getAcademy,
  };
})(window.Game = window.Game || {});
