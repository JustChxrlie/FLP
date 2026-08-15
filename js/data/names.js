/**
 * names.js
 * Name/surname banks per country, used by the "Random name" button in
 * player creation and, in later phases, to generate NPCs. Lists are
 * intentionally short and easy to extend; there's a generic fallback
 * bank for countries without their own list.
 */
(function (Game) {
  Game.data = Game.data || {};

  Game.data.names = {
    CA: { first: ['Connor', 'Liam', 'Owen', 'Cole', 'Jack', 'Tyler'], last: ['MacDonald', 'Tremblay', 'Campbell', 'Sinclair', 'Whitfield', 'Doyle'] },
    US: { first: ['Cooper', 'Hunter', 'Blake', 'Dylan', 'Mason', 'Wyatt'], last: ['Harrison', 'Sullivan', 'Bennett', 'Foster', 'Carter', 'Reid'] },
    SE: { first: ['Erik', 'Anton', 'Viktor', 'Gustav', 'Filip', 'Oskar'], last: ['Lindqvist', 'Karlsson', 'Bergström', 'Nilsson', 'Sandberg', 'Holm'] },
    FI: { first: ['Mikko', 'Joonas', 'Aleksi', 'Eetu', 'Niko', 'Santeri'], last: ['Virtanen', 'Koivu', 'Laine', 'Mäkelä', 'Salo', 'Rantanen'] },
    RU: { first: ['Ivan', 'Dmitri', 'Nikita', 'Artem', 'Pavel', 'Yegor'], last: ['Volkov', 'Petrov', 'Sokolov', 'Orlov', 'Bykov', 'Titov'] },
    CZ: { first: ['Jakub', 'Tomáš', 'Ondřej', 'Filip', 'Matěj', 'David'], last: ['Novák', 'Dvořák', 'Procházka', 'Horák', 'Beneš', 'Král'] },
    SK: { first: ['Martin', 'Adam', 'Šimon', 'Lukáš', 'Marek', 'Peter'], last: ['Varga', 'Baláž', 'Kováč', 'Petrík', 'Novotný', 'Sabo'] },
    CH: { first: ['Luca', 'Noah', 'Elias', 'Sven', 'Timo', 'Nico'], last: ['Zimmermann', 'Keller', 'Baumann', 'Frei', 'Steiner', 'Meier'] },
    DE: { first: ['Leon', 'Finn', 'Jonas', 'Paul', 'Moritz', 'Felix'], last: ['Hoffmann', 'Schneider', 'Wagner', 'Becker', 'Krüger', 'Richter'] },
    MX: { first: ['Santiago', 'Mateo', 'Diego', 'Emiliano', 'Rodrigo', 'Alejandro'], last: ['Hernández', 'García', 'Morales', 'Vázquez', 'Reyes', 'Castillo'] },
    AR: { first: ['Lautaro', 'Thiago', 'Bruno', 'Facundo', 'Ignacio', 'Nicolás'], last: ['Fernández', 'Romero', 'Acosta', 'Molina', 'Ibáñez', 'Sosa'] },
    NO: { first: ['Magnus', 'Sander', 'Jonas', 'Kristian', 'Emil', 'Aksel'], last: ['Haugen', 'Johansen', 'Solberg', 'Kristiansen', 'Berg', 'Dahl'] },
    LV: { first: ['Roberts', 'Kristaps', 'Artūrs', 'Mārtiņš', 'Toms', 'Kārlis'], last: ['Bērziņš', 'Ozoliņš', 'Kalniņš', 'Jansons', 'Liepiņš', 'Krūmiņš'] },
    DK: { first: ['Mikkel', 'Frederik', 'Oliver', 'Lucas', 'Anton', 'Emil'], last: ['Nielsen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Madsen'] },
    JP: { first: ['Haruto', 'Sota', 'Ren', 'Yuto', 'Riku', 'Kaito'], last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito'] },
  };

  Game.data.genericNames = { first: ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan'], last: ['Stone', 'Brooks', 'Parker', 'Hayes', 'Ellis', 'Reed'] };

  /** Returns a random first/last name appropriate for the country (or generic if no bank exists). */
  Game.data.randomName = function (countryCode) {
    const bank = Game.data.names[countryCode] || Game.data.genericNames;
    return {
      firstName: Game.utils.randChoice(bank.first),
      lastName: Game.utils.randChoice(bank.last),
    };
  };
})(window.Game = window.Game || {});
