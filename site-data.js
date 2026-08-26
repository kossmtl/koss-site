/* K-OSS — chargeur de données du site.
   Va chercher data.txt (à la racine du site) et remplit automatiquement
   les dates, liens, téléphone et courriel marqués dans les pages via des
   attributs data-field / data-field-href / data-field-booking.
   Si data.txt est absent ou ne se charge pas (ex. : fichier ouvert en
   local plutôt que via un vrai serveur web), les pages gardent leur texte
   actuel tel quel — rien ne casse, ça affiche juste les dernières valeurs
   connues au lieu des toutes dernières. */
(function () {
  "use strict";

  function parseData(text) {
    var data = {};
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === "#") return;
      var idx = line.indexOf("=");
      if (idx === -1) return;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim();
      if (key) data[key] = val;
    });
    return data;
  }

  var MOIS_FR = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5,
    "juin": 6, "juillet": 7, "août": 8, "aout": 8, "septembre": 9,
    "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12
  };

  function toMMDDYY(dateFr) {
    // "7 septembre 2026" -> "09/07/26"
    var m = dateFr.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
    if (!m) return null;
    var day = parseInt(m[1], 10);
    var month = MOIS_FR[m[2].toLowerCase()];
    var year = m[3].slice(2);
    if (!month || !day) return null;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(month) + "/" + pad(day) + "/" + year;
  }

  function applyData(data) {
    // Texte (dates, téléphone, courriel affichés)
    var textEls = document.querySelectorAll("[data-field]");
    for (var i = 0; i < textEls.length; i++) {
      var el = textEls[i];
      var key = el.getAttribute("data-field");
      if (data[key] !== undefined) el.textContent = data[key];
    }

    // Liens simples (href à remplacer tel quel, ou construit pour tel:/mailto:)
    var hrefEls = document.querySelectorAll("[data-field-href]");
    for (var j = 0; j < hrefEls.length; j++) {
      var a = hrefEls[j];
      var hkey = a.getAttribute("data-field-href");
      if (data[hkey] === undefined) continue;
      var val = data[hkey];
      var type = a.getAttribute("data-field-href-type");
      if (type === "tel") {
        a.setAttribute("href", "tel:" + val.replace(/[^\d+]/g, ""));
      } else if (type === "mailto") {
        var subject = a.getAttribute("data-mailto-subject");
        a.setAttribute(
          "href",
          "mailto:" + val + (subject ? "?subject=" + encodeURIComponent(subject) : "")
        );
      } else {
        a.setAttribute("href", val);
      }
    }

    // Liens de réservation MINDBODY dont la date est intégrée dans l'adresse —
    // reconstruits à partir d'un champ date + d'une adresse de base fixe.
    var bookingEls = document.querySelectorAll("[data-field-booking]");
    for (var k = 0; k < bookingEls.length; k++) {
      var b = bookingEls[k];
      var dateKey = b.getAttribute("data-field-booking");
      var base = b.getAttribute("data-booking-base");
      if (data[dateKey] === undefined || !base) continue;
      var mmddyy = toMMDDYY(data[dateKey]);
      if (mmddyy) b.setAttribute("href", base + "&date=" + mmddyy);
    }
  }

  fetch("data.txt", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("data.txt introuvable");
      return r.text();
    })
    .then(function (text) {
      applyData(parseData(text));
    })
    .catch(function () {
      /* Pas de mise à jour possible pour l'instant — la page garde son
         contenu tel quel, aucune erreur visible pour la visiteuse ou le
         visiteur. */
    });
})();
