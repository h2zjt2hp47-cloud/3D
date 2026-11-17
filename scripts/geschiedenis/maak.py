# Maakt docs/geschiedenis-tijdperken.json en docs/onderzoek-geschiedenis.md uit één gegevensbron.
import json, sys

W = "https://en.wikipedia.org/wiki/"
NN = "NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via "

WV, OV, ANT, VB, BRU, WB, HEN, NAM, LUI, LIM, LUX = ("West-Vlaanderen", "Oost-Vlaanderen", "Antwerpen", "Vlaams-Brabant", "Brussel", "Waals-Brabant", "Henegouwen", "Namen", "Luik", "Limburg (B)", "Luxemburg (B)")
FVL, ART, AIS, FAR, ZVL, NLL, GHL = ("Frans-Vlaanderen", "Artesie (Pas-de-Calais)", "Aisne", "Franse Ardennen", "Zeeuws-Vlaanderen", "Nederlands-Limburg", "Groothertogdom Luxemburg")
ALLES = [WV, OV, ANT, VB, BRU, WB, HEN, NAM, LUI, LIM, LUX, FVL, ART, AIS, FAR, ZVL, NLL, GHL]
BE = [WV, OV, ANT, VB, BRU, WB, HEN, NAM, LUI, LIM, LUX]


def F(id, naam, soort, heerser, gebieden, zetel, lat, lon, oorlog=(), bond=(), heer=None, bron="", opm=""):
    return {"id": id, "naam": naam, "soort": soort, "heerser": heerser, "gebieden": list(gebieden),
            "zetel": {"naam": zetel, "lat": lat, "lon": lon},
            "relaties": {"oorlog": list(oorlog), "bond": list(bond), "heer": heer},
            "bron": bron, "opmerking": opm}


def E(datum, precisie, titel, tekst, gevolg, bron, onzeker=False):
    return {"datum": datum, "precisie": precisie, "titel": titel, "tekst": tekst, "gevolg": gevolg,
            "bron": bron, "onzeker": onzeker}


def V(naam, lat, lon):
    return {"naam": naam, "lat": lat, "lon": lon}


T = []

# ---------------------------------------------------------------- 1 Romeinen
T.append({
    "id": "romeinen", "naam": "Romeinen", "van": "-0057", "tot": "0481",
    "grens": "Voorstel: einde bij 481 (Clovis koning) in plaats van ±430, zodat tijdperk 2 met een duidelijke toestand begint. Chlodio's opmars (±430-450) valt dan nog in dit tijdperk.",
    "startmoment": "voorjaar 57 v.Chr., vlak voor Caesars veldtocht tegen de Belgen",
    "bevolking": {"waarde": "geen betrouwbare schatting; grootte-orde enkele honderdduizenden (ONZEKER). Caesar noemt in BG 2.4 aantallen strijders per volk (bv. 19.000 Aduatuci), maar die cijfers gelden als overdreven.",
                  "bron": "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2*.html ; " + W + "Siege_of_the_Atuatuci"},
    "facties": [
        F("rome", "Romeinse Republiek", "rijk", "Gaius Julius Caesar, proconsul van Gallie 58-50 v.Chr. (Rome zelf: consuls; geen alleenheerser)", [], "Rome", 41.89, 12.49,
          oorlog=["suessiones", "nerviers", "atrebaten", "viromandui", "morini", "menapiers", "aduatuci", "eburonen", "condrusen"], bond=["remi", "treveri"], bron=W + "Battle_of_the_Axona"),
        F("remi", "Remi", "staat", "Iccius en Andecomborius (leiders/gezanten; of zij koningen waren is ONZEKER)", [AIS, FAR], "Durocortorum (Reims)", 49.26, 4.03,
          bond=["rome"], oorlog=["suessiones"], bron=W + "Battle_of_the_Axona", opm="Reims ligt net buiten de kaart; Bibrax (Remi) ligt in Aisne."),
        F("suessiones", "Suessiones", "staat", "Galba, koning (57 v.Chr.), aanvoerder van de Belgische coalitie", [AIS], "Noviodunum (bij Soissons; ligging ONZEKER)", 49.40, 3.30,
          oorlog=["rome", "remi"], bond=["nerviers", "atrebaten", "viromandui", "morini", "menapiers", "aduatuci", "eburonen", "condrusen"], bron=W + "Battle_of_the_Axona"),
        F("nerviers", "Nerviers", "staat", "Boduognatus, legeraanvoerder (57 v.Chr.)", [HEN, FVL, WB, VB], "geen gekende hoofdplaats; later Bagacum (Bavay)", 50.30, 3.79,
          oorlog=["rome", "remi"], bond=["suessiones", "atrebaten", "viromandui", "aduatuci"], bron=W + "Battle_of_the_Sabis", opm="Grenzen van het Nervisch gebied bij benadering."),
        F("atrebaten", "Atrebaten", "staat", "onbekend; Commius pas na de nederlaag door Caesar als koning aangesteld (ONZEKER wanneer precies)", [ART], "Nemetocenna (Arras)", 50.29, 2.78,
          oorlog=["rome", "remi"], bond=["nerviers", "suessiones", "viromandui"], bron=W + "Battle_of_the_Sabis"),
        F("viromandui", "Viromandui", "staat", "onbekend", [AIS], "later Augusta Viromanduorum (Saint-Quentin)", 49.85, 3.29,
          oorlog=["rome", "remi"], bond=["nerviers", "atrebaten", "suessiones"], bron=W + "Battle_of_the_Sabis"),
        F("morini", "Morini", "staat", "onbekend", [ART, FVL], "later Tarvenna (Therouanne)", 50.64, 2.26,
          oorlog=["rome", "remi"], bond=["suessiones", "menapiers"], bron=W + "Battle_of_the_Axona", opm="Deelname aan de coalitie volgens Caesar BG 2.4."),
        F("menapiers", "Menapiers", "staat", "onbekend", [WV, OV, ZVL, ANT, FVL], "later Castellum Menapiorum (Kassel)", 50.80, 2.49,
          oorlog=["rome", "remi"], bond=["suessiones", "morini"], bron=W + "Battle_of_the_Axona"),
        F("aduatuci", "Aduatuci", "staat", "onbekend", [NAM, LUI], "versterkte burcht (oppidum Aduatucorum; ligging ONZEKER: Namen, Thuin of elders)", 50.46, 4.87,
          oorlog=["rome", "remi"], bond=["nerviers", "suessiones"], bron=W + "Siege_of_the_Atuatuci"),
        F("eburonen", "Eburonen", "staat", "Ambiorix en Catuvolcus, samen koning", [LIM, LUI, NLL, ANT], "Atuatuca (ligging ONZEKER; vaak met Tongeren verbonden)", 50.78, 5.46,
          oorlog=["rome", "remi"], bond=["suessiones"], heer="aduatuci", bron=W + "Ambiorix%27s_revolt",
          opm="Volgens Caesar (BG 5.27) betaalden de Eburonen schatting aan de Aduatuci; als 'heer' ingevuld, ONZEKER."),
        F("treveri", "Treveri", "staat", "rivaliteit tussen Indutiomarus en zijn schoonzoon Cingetorix (bekend uit 54 v.Chr.)", [GHL, LUX, FAR], "oppidum Titelberg", 49.54, 5.86,
          bond=["rome"], bron=W + "Indutiomarus", opm="In 57 v.Chr. reden Treverische ruiters nog met Caesar mee; later opstandig."),
        F("condrusen", "Condrusen en andere 'Germani cisrhenani' (Caerosi, Paemani, Segni)", "staat", "onbekend", [NAM, LUI, LUX], "onbekend (Condroz)", 50.29, 5.10,
          oorlog=["rome", "remi"], bond=["suessiones", "eburonen"], bron="https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2*.html", opm="Samengevoegd tot één factie voor het spel."),
    ],
    "gebeurtenissen": [
        E("-0057-06-01", "jaar", "Beleg van Bibrax en slag aan de Axona", "De Belgische coalitie onder Galba belegert het Remische Bibrax; Caesar stuurt hulp en slaat een aanval op zijn kamp aan de Aisne af.", "De coalitie valt uiteen; de Suessiones en daarna andere volken onderwerpen zich.", W + "Battle_of_the_Axona", True),
        E("-0057-07-01", "jaar", "Slag aan de Sabis", "Nerviers onder Boduognatus, met Atrebaten en Viromandui, overvallen Caesars leger aan de rivier (meestal de Selle, vroeger de Samber).", "Romeinse overwinning; de Nerviers zijn gebroken, de Aduatuci komen te laat.", W + "Battle_of_the_Sabis", True),
        E("-0057-09-01", "maand", "Beleg van de Aduatuci", "Caesar neemt de burcht van de Aduatuci in na een verraderlijke uitval.", "Volgens Caesar worden 53.000 overlevenden als slaaf verkocht; de Aduatuci verdwijnen als macht.", W + "Siege_of_the_Atuatuci", True),
        E("-0054-10-01", "maand", "Hinderlaag bij Atuatuca", "Ambiorix en Catuvolcus lokken het winterkamp van Sabinus en Cotta naar buiten en vernietigen anderhalf legioen.", "Opstand in het noorden van Gallie; Romeins gezag wankelt.", "https://www.historyofwar.org/articles/battles_atuatuca.html ; " + W + "Ambiorix%27s_revolt", True),
        E("-0054-12-01", "jaar", "Dood van Indutiomarus", "De Treverische leider Indutiomarus sneuvelt bij een ruiteraanval van Labienus; Cingetorix krijgt de macht.", "Treveri tijdelijk onder een Rome-gezinde leider (jaar 54 of 53 v.Chr. betwist).", W + "Indutiomarus", True),
        E("-0053-06-01", "jaar", "Vernietiging van de Eburonen", "Caesar laat het land van de Eburonen plunderen; Catuvolcus pleegt zelfmoord, Ambiorix ontsnapt.", "Eburonen verdwijnen; later wonen hier de Tungri.", W + "Ambiorix%27s_revolt", True),
        E("-0022-01-01", "jaar", "Provincie Gallia Belgica", "Agrippa deelt Gallie in drie delen, waaronder Belgica (jaar volgens Britannica/Wikipedia; andere bronnen noemen 27 of 16-13 v.Chr.).", "Het hele gebied wordt Romeinse provincie, ingedeeld in civitates.", "https://britannica.com/place/Belgica-ancient-province-Europe", True),
        E("0069-01-01", "jaar", "Bataafse opstand", "Julius Civilis komt in opstand; Treveri en Lingones (Classicus, Tutor) roepen een 'Gallisch rijk' uit; Cerialis herstelt het gezag in 70.", "Tijdelijk verlies van Romeins gezag in het noorden; daarna herstel.", W + "Revolt_of_the_Batavi"),
        E("0083-01-01", "jaar", "Germania Inferior", "Onder Domitianus wordt de Rijnzone een eigen provincie; de civitas Tungrorum (Tongeren) komt erbij (rond 83-85; sommige bronnen pas onder Diocletianus).", "Grens tussen provincies loopt dwars door het latere Belgie.", "https://www.taylorfrancis.com/chapters/oa-edit/10.5117/9789462983601_CH06/late-roman-town-tongeren-alain-vanderhoeven", True),
        E("0260-09-01", "jaar", "Gallisch keizerrijk", "Postumus, landvoogd van Neder-Germanie, komt in de herfst van 260 in opstand en sticht een eigen rijk (hoofdstad Keulen, later Trier).", "Het gebied hoort 260-274 bij een afgescheurd rijk; Aurelianus wint in 274 bij Chalons.", W + "Gallic_Empire"),
        E("0358-01-01", "jaar", "Salische Franken in Toxandrie", "Julianus aanvaardt de onderwerping van de Salische Franken en laat hen in Toxandrie (Kempen) wonen.", "Eerste erkende Frankische vestiging binnen het rijk.", NN + W + "Toxandria", True),
        E("0406-12-31", "dag", "Rijnoversteek", "Vandalen, Alanen en Sueben steken de Rijn over, traditioneel op 31 december 406 (datum betwist).", "Rijnverdediging stort in; Noord-Gallie wordt geplunderd.", W + "Crossing_of_the_Rhine", True),
        E("0440-01-01", "jaar", "Chlodio neemt Doornik en Kamerijk", "Volgens Gregorius van Tours trekt Chlodio door het Kolenwoud, neemt Doornik en Kamerijk en rukt op tot de Somme (jaar ONZEKER, ±430-450).", "Frankisch koninkrijk rond Doornik.", "https://Www.Wikipedia.org/wiki/Childeric_I", True),
    ],
    "versterkingen": [V("Atuatuca Tungrorum (Tongeren)", 50.78, 5.46), V("Bagacum (Bavay)", 50.30, 3.79), V("Bibrax (Vieux-Laon, ONZEKER)", 49.47, 3.83),
                      V("Augusta Suessionum (Soissons)", 49.38, 3.32), V("Nemetacum (Arras)", 50.29, 2.78), V("Castellum Menapiorum (Kassel)", 50.80, 2.49),
                      V("Tarvenna (Therouanne)", 50.64, 2.26), V("Turnacum (Doornik)", 50.61, 3.39), V("Oudenburg (kustfort)", 51.18, 3.00),
                      V("Aardenburg (kustfort)", 51.27, 3.45), V("Traiectum (Maastricht)", 50.85, 5.69), V("Orolaunum (Aarlen)", 49.68, 5.81),
                      V("Titelberg (oppidum)", 49.54, 5.86), V("Augusta Treverorum (Trier, net buiten kaart)", 49.75, 6.64)],
    "namen": ["Ambiorix", "Catuvolcus", "Boduognatus", "Galba", "Iccius", "Andecomborius", "Commius", "Indutiomarus", "Cingetorix", "Civilis", "Classicus", "Tutor", "Postumus", "Tetricus", "Chlodio", "Merovech"],
    "dynastieen": ["Juliers-Claudiers (Rome)", "Gallische keizers (Postumus tot Tetricus)", "vroege Merovingen (Chlodio, Merovech)"],
})

# ---------------------------------------------------------------- 2 Franken
T.append({
    "id": "franken", "naam": "Franken", "van": "0481", "tot": "0843",
    "grens": "Start 481 (Childerik sterft, Clovis koning; jaar afgeleid, niet gedocumenteerd).",
    "startmoment": "481, troonsbestijging van Clovis in Doornik",
    "bevolking": {"waarde": "geen betrouwbare schatting (ONZEKER)", "bron": "-"},
    "facties": [
        F("salfranken", "Salische Franken van Doornik", "staat", "Clovis I, koning 481-511", [HEN, WV, OV], "Doornik", 50.61, 3.39,
          bond=["kamerijk"], bron="https://Www.Wikipedia.org/wiki/Childeric_I", opm="Omvang van het rijk in 481 ONZEKER."),
        F("kamerijk", "Franken van Kamerijk", "staat", "Ragnachar, koning (gestorven ±509, ONZEKER)", [FVL, ART], "Kamerijk", 50.18, 3.23,
          bond=["salfranken"], bron="https://Www.Wikipedia.org/wiki/Childeric_I"),
        F("rijnfranken", "Rijnfranken (Ripuariers)", "staat", "Sigibert de Lamme, koning in Keulen (jaren ONZEKER)", [NLL, LUI, LIM, GHL], "Keulen", 50.94, 6.96,
          bron=NN + W + "Sigebert_the_Lame", opm="Omvang naar het westen ONZEKER."),
        F("syagrius", "Rijk van Syagrius (Soissons)", "staat", "Syagrius, 'koning der Romeinen' (±464-486)", [AIS, FAR, NAM, LUX], "Soissons", 49.38, 3.32,
          bron="https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Clovis_I", opm="Noordgrens en omvang ONZEKER."),
        F("byzantium", "Oost-Romeinse rijk", "rijk", "keizer Zeno (474-491)", [], "Constantinopel", 41.01, 28.98, bron=NN + W + "Zeno_(emperor)"),
        F("visigoten", "Visigoten", "rijk", "Eurik (466-484)", [], "Toulouse", 43.60, 1.44, bron=NN + W + "Euric", opm="Syagrius vlucht in 486 naar Alarik II."),
        F("alamannen", "Alamannen", "rijk", "onbekend", [], "geen vaste zetel (Boven-Rijn, ONZEKER)", 48.58, 7.75, bron=NN + W + "Battle_of_Tolbiac"),
    ],
    "gebeurtenissen": [
        E("0486-01-01", "jaar", "Slag bij Soissons", "Clovis verslaat Syagrius, die vlucht naar de Visigoten.", "Het laatste Romeinse gebied in Noord-Gallie komt onder de Franken.", "https://Www.Wikipedia.org/wiki/Childeric_I"),
        E("0496-01-01", "jaar", "Slag bij Tolbiac en doop van Clovis", "Clovis verslaat de Alamannen en laat zich dopen in Reims (jaar betwist: 496, 498 of 508).", "Frankisch rijk katholiek; steun van de Gallo-Romeinse bisschoppen.", NN + W + "Battle_of_Tolbiac", True),
        E("0511-11-27", "dag", "Dood van Clovis, eerste deling", "Clovis sterft; het rijk wordt verdeeld onder zijn vier zonen.", "Begin van de herhaalde rijksdelingen (later Austrasie en Neustrie).", NN + W + "Clovis_I", True),
        E("0640-01-01", "jaar", "Dood van Pepijn van Landen", "De hofmeier van Austrasie, stamvader van de Pippiniden, sterft.", "Pippiniden blijven machtig in het Maasland.", NN + W + "Pepin_of_Landen", True),
        E("0687-01-01", "jaar", "Slag bij Tertry", "Pepijn van Herstal verslaat Neustrie en Bourgondie.", "Pippiniden worden de werkelijke heersers van het hele Frankische rijk.", "https://en.wikipedia.com/wiki/Battle_of_Tertry"),
        E("0714-12-16", "dag", "Dood van Pepijn van Herstal", "Pepijn van Herstal sterft; opvolgingsstrijd tot Karel Martel wint (719).", "Machtsstrijd, daarna Karel Martel hofmeier.", "https://familypedia.fandom.com/wiki/Pepin_of_Herstal", True),
        E("0732-10-10", "jaar", "Slag bij Poitiers/Tours", "Karel Martel verslaat het leger van Abd al-Rahman (dag traditioneel 10 oktober, ONZEKER).", "Groot prestige voor de Pippiniden.", "https://www.Britannica.Com/biography/Charles-Martel", True),
        E("0751-11-01", "jaar", "Pepijn de Korte koning", "Pepijn zet de laatste Merovingische koning af en wordt met pauselijke steun koning.", "Begin van de Karolingische dynastie.", "https://www.Britannica.Com/biography/Charles-Martel"),
        E("0800-12-25", "dag", "Karel de Grote keizer", "Paus Leo III kroont Karel de Grote in Rome tot keizer.", "Aken wordt hart van een keizerrijk; het hele kaartgebied ligt erin.", NN + W + "Charlemagne", True),
        E("0843-08-10", "maand", "Verdrag van Verdun", "De kleinzonen van Karel de Grote verdelen het rijk; Lotharius krijgt het Middenrijk (dag ONZEKER, augustus 843).", "De Schelde wordt grens: westelijk West-Francie, oostelijk het Middenrijk.", "https://en.Wikipedia.com/wiki/Middle_Francia", True),
    ],
    "versterkingen": [V("Doornik", 50.61, 3.39), V("Kamerijk", 50.18, 3.23), V("Soissons", 49.38, 3.32), V("Laon", 49.56, 3.62),
                      V("Herstal (palts)", 50.66, 5.63), V("Jupille (palts)", 50.64, 5.63), V("Landen", 50.75, 5.08), V("Maastricht", 50.85, 5.69),
                      V("Aken (palts, net buiten kaart)", 50.78, 6.08), V("Keulen (buiten kaart)", 50.94, 6.96)],
    "namen": ["Chlodovech (Clovis)", "Childerik", "Chlotarius", "Theuderik", "Sigebert", "Dagobert", "Pepijn", "Grimoald", "Karel", "Karloman", "Lodewijk", "Lotharius", "Ragnachar", "Ansegisel", "Begga", "Gertrudis", "Plectrudis"],
    "dynastieen": ["Merovingen", "Pippiniden / Karolingen (Landen, Herstal)"],
})

# ---------------------------------------------------------------- 3 Vroege middeleeuwen
T.append({
    "id": "vroege_middeleeuwen", "naam": "Vroege middeleeuwen", "van": "0843", "tot": "1100",
    "grens": "Start: Verdrag van Verdun (augustus 843). Einde 1100 (dood Godfried van Bouillon); 1106 (Godfried van Leuven hertog van Neder-Lotharingen) is ook verdedigbaar.",
    "startmoment": "augustus 843, na Verdun",
    "bevolking": {"waarde": "geen betrouwbare schatting (ONZEKER)", "bron": "-"},
    "facties": [
        F("middenrijk", "Middenrijk (Lotharius)", "rijk", "keizer Lotharius I (keizer 840-855)", [ANT, VB, BRU, WB, HEN, NAM, LUI, LIM, LUX, NLL, GHL, FAR], "Aken", 50.78, 6.08,
          bron="https://en.Wikipedia.com/wiki/Middle_Francia", opm="Grens langs de Schelde; zuidwestgrens in Henegouwen en Ardennen ONZEKER."),
        F("westfrankenrijk", "West-Francie", "rijk", "Karel de Kale (koning 843-877)", [WV, OV, ZVL, FVL, ART, AIS], "Compiegne/Laon (rondreizend hof, ONZEKER)", 49.42, 2.83,
          bron="https://en.Wikipedia.com/wiki/Middle_Francia"),
        F("oostfrankenrijk", "Oost-Francie", "rijk", "Lodewijk de Duitser (koning 843-876)", [], "Regensburg", 49.01, 12.10, bron="https://en.Wikipedia.com/wiki/Middle_Francia"),
        F("vikingen", "Vikingen", "rijk", "geen vaste leider (o.a. Rorik in Friesland, ONZEKER)", [], "Dorestad (ONZEKER)", 51.97, 5.34,
          oorlog=["middenrijk", "westfrankenrijk"], bron=NN + W + "Rorik_of_Dorestad", opm="Plunderende groepen, geen staat."),
    ],
    "gebeurtenissen": [
        E("0855-09-01", "jaar", "Verdrag van Prum", "Lotharius I verdeelt op zijn sterfbed het Middenrijk; het noorden gaat naar Lotharius II.", "Ontstaan van Lotharingen.", "https://en.Wikipedia.com/wiki/Middle_Francia"),
        E("0862-01-01", "jaar", "Boudewijn en Judith", "Boudewijn schaakt Judith, dochter van Karel de Kale (Kerstmis 861 of 862); na verzoening wordt hij graaf in Vlaanderen.", "Begin van het graafschap Vlaanderen onder Boudewijn I.", W + "Judith_of_Flanders", True),
        E("0870-08-08", "dag", "Verdrag van Meerssen", "Lodewijk de Duitser en Karel de Kale verdelen Lotharingen, ruwweg langs Maas, Ourthe en Moezel.", "Westelijk Lotharingen naar West-Francie, oostelijk naar Oost-Francie.", W + "Treaty_of_Meerssen"),
        E("0880-02-01", "jaar", "Verdrag van Ribemont", "Heel Lotharingen gaat naar Oost-Francie.", "Schelde weer grens tussen west en oost.", W + "Treaty_of_Meerssen", True),
        E("0891-09-01", "maand", "Slag bij Leuven", "Arnulf van Karinthie verslaat de Vikingen aan de Dijle; hun leiders Sigfried en Godfried sneuvelen (september of november).", "Einde van het grote Vikingkamp bij Leuven; invallen gaan beperkt door.", W + "Battle_of_Leuven_(891)", True),
        E("0925-01-01", "jaar", "Lotharingen bij Oost-Francie", "De Lotharingers onder Giselbert erkennen Hendrik de Vogelaar als koning.", "Lotharingen hoort voortaan bij het Duitse Rijk.", "https://wikiwand.com/en/articles/Dukes_of_Lotharingia"),
        E("0959-01-01", "jaar", "Splitsing van Lotharingen", "Bruno van Keulen splitst Lotharingen in Neder- en Opper-Lotharingen.", "Neder-Lotharingen omvat het grootste deel van het latere Belgie ten oosten van de Schelde.", "https://Www.Wikipedia.org/wiki/Lower_Lorraine"),
        E("0963-04-12", "dag", "Stichting van Luxemburg", "Graaf Siegfried ruilt met de abdij van Sint-Maximinus de burcht Lucilinburhuc (oorkonde gedateerd 17 april, vermoedelijk fout; Palmzondag viel op 12 april).", "Kern van het latere graafschap Luxemburg.", W + "County_of_Luxembourg", True),
        E("0985-07-07", "dag", "Prinsbisdom Luik", "Bisschop Notger krijgt het graafschap Hoei met wereldlijke macht (980 of 985 volgens bron).", "Luik wordt een vorstendom binnen het Rijk.", W + "Prince-Bishopric_of_Li%C3%A8ge", True),
        E("0987-07-03", "dag", "Hugo Capet koning", "Hugo Capet wordt koning van West-Francie; Karel van Neder-Lotharingen (Karolinger) mist de troon.", "Capetingers in Frankrijk, leenheren van Vlaanderen.", NN + W + "Hugh_Capet", True),
        E("1003-01-01", "jaar", "Graafschap Leuven", "Lambert I de Gebaarde wordt rond 1003 graaf van Leuven genoemd.", "Kern van het latere hertogdom Brabant.", "https://Www.wikipedia.org/wiki/Count_of_Leuven", True),
        E("1096-08-15", "jaar", "Godfried van Bouillon op kruistocht", "Godfried, hertog van Neder-Lotharingen, verkoopt/verpandt Bouillon aan Luik en vertrekt op kruistocht.", "Bouillon naar Luik; hertogstitel komt vrij na zijn dood in 1100.", NN + W + "Godfrey_of_Bouillon", True),
    ],
    "versterkingen": [V("Gent (Gravensteen-plaats)", 51.06, 3.72), V("Brugge (burg)", 51.21, 3.22), V("Leuven", 50.88, 4.70), V("Namen", 50.46, 4.87),
                      V("Bergen (Mons)", 50.45, 3.95), V("Luxemburg (Bock)", 49.61, 6.13), V("Luik", 50.64, 5.57), V("Hoei", 50.52, 5.24),
                      V("Bouillon", 49.79, 5.07), V("Valenciennes", 50.36, 3.52), V("Antwerpen", 51.22, 4.40), V("Limbourg", 50.61, 5.94),
                      V("Borgloon", 50.80, 5.34), V("Atrecht (Arras)", 50.29, 2.78), V("Sint-Omaars", 50.75, 2.25)],
    "namen": ["Boudewijn", "Arnulf", "Robrecht", "Reinier", "Lambert", "Godfried", "Hendrik", "Gozelo", "Albert", "Siegfried", "Notger", "Giselbert", "Everhard", "Judith", "Gerberga", "Ermengarde"],
    "dynastieen": ["Karolingen", "Ottonen/Saliers (Duitse Rijk)", "Capetingers", "Vlaamse gravenhuis (Boudewijn)", "Reiniers (Henegouwen, Leuven)", "Ardense huis (Luxemburg, Verdun)"],
})

# ---------------------------------------------------------------- 4 Hoge middeleeuwen
T.append({
    "id": "hoge_middeleeuwen", "naam": "Hoge middeleeuwen", "van": "1100", "tot": "1384",
    "grens": "Start 1100; einde bij dood van Lodewijk van Male (30 januari 1384).",
    "startmoment": "begin 1100",
    "bevolking": {"waarde": "geen betrouwbare schatting (ONZEKER)", "bron": "-"},
    "facties": [
        F("vlaanderen", "Graafschap Vlaanderen", "staat", "Robrecht II 'van Jeruzalem' (graaf 1093-1111; jaren niet bevestigd in bron)", [WV, OV, ZVL, FVL, ART], "Brugge", 51.21, 3.22,
          heer="frankrijk", bron=W + "Godfrey_I,_Count_of_Louvain", opm="Rijks-Vlaanderen (o.a. Aalst, Zeeuws-Vlaanderen) was leen van de Duitse keizer; hier vereenvoudigd."),
        F("henegouwen", "Graafschap Henegouwen", "staat", "Boudewijn III (1098-1120)", [HEN], "Bergen", 50.45, 3.95, heer="duitserijk", bron="https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Counts_of_Hainaut.html"),
        F("namen", "Graafschap Namen", "staat", "Albert III (±1063/1067-1102)", [NAM], "Namen", 50.46, 4.87, heer="duitserijk", bron=W + "Albert_III,_Count_of_Namur"),
        F("leuven", "Graafschap Leuven (later hertogdom Brabant)", "staat", "Godfried I (graaf 1095-1139)", [VB, BRU, WB, ANT], "Leuven", 50.88, 4.70, heer="duitserijk", bron=W + "Godfrey_I,_Count_of_Louvain"),
        F("limburg", "Graafschap Limburg", "staat", "Hendrik I (1082-1119)", [LUI, NLL], "Limbourg", 50.61, 5.94, heer="duitserijk", bron="https://Www.Wikipedia.org/wiki/Henry,_Duke_of_Lower_Lorraine"),
        F("luik", "Prinsbisdom Luik", "staat", "Otbert (bisschop; 1091-1119 niet bevestigd)", [LUI, NAM, LIM], "Luik", 50.64, 5.57, heer="duitserijk", bron=W + "Arnold_I,_Count_of_Loon", opm="Gebied versnipperd; Bouillon sinds 1096 Luiks."),
        F("loon", "Graafschap Loon", "staat", "Arnold I (1078-1135)", [LIM], "Borgloon", 50.80, 5.34, heer="duitserijk", bron=W + "Arnold_I,_Count_of_Loon"),
        F("luxemburg", "Graafschap Luxemburg", "staat", "Willem I (1096-1131; niet bevestigd)", [GHL, LUX], "Luxemburg", 49.61, 6.13, heer="duitserijk", bron=NN + W + "County_of_Luxembourg"),
        F("boulogne", "Graafschap Boulogne", "staat", "Eustatius III (1087-1125; niet bevestigd)", [ART], "Boulogne", 50.73, 1.61, heer="frankrijk", bron=NN + W + "Eustace_III,_Count_of_Boulogne"),
        F("duitserijk", "Heilig Roomse Rijk", "rijk", "keizer Hendrik IV (koning 1056, keizer 1084-1105)", [], "Aken (kroningsstad; geen vaste hoofdstad)", 50.78, 6.08, bron=NN + W + "Henry_IV,_Holy_Roman_Emperor"),
        F("frankrijk", "Koninkrijk Frankrijk", "rijk", "Filips I (1060-1108)", [AIS], "Parijs", 48.86, 2.35, bron=NN + W + "Philip_I_of_France"),
    ],
    "gebeurtenissen": [
        E("1106-01-01", "jaar", "Godfried van Leuven hertog", "Na de dood van keizer Hendrik IV verliest Hendrik van Limburg de hertogstitel van Neder-Lotharingen aan Godfried I van Leuven.", "Leuven/Brabant stijgt boven de andere vorsten uit; rivaliteit met Limburg.", W + "Godfrey_I,_Count_of_Louvain"),
        E("1127-03-02", "dag", "Moord op Karel de Goede", "Graaf Karel de Goede wordt in de Sint-Donaaskerk in Brugge vermoord door de Erembalden.", "Opvolgingscrisis in Vlaanderen; Diederik van de Elzas wordt graaf (1128).", W + "Charles_the_Good"),
        E("1183-01-01", "jaar", "Hertogdom Brabant", "Hendrik I voert de titel hertog van Brabant (1183 of 1190, ONZEKER).", "Brabant als hertogdom.", NN + W + "Duchy_of_Brabant", True),
        E("1214-07-27", "dag", "Slag bij Bouvines", "Filips II August van Frankrijk verslaat een coalitie; graaf Ferrand van Vlaanderen wordt gevangen genomen.", "Franse greep op Vlaanderen versterkt; Ferrand blijft tot 1227 gevangen.", "https://www.britannica.com/event/Battle-of-Bouvines"),
        E("1288-06-05", "dag", "Slag bij Woeringen", "Jan I van Brabant wint de Limburgse Successieoorlog.", "Limburg komt bij Brabant.", NN + W + "Battle_of_Worringen", True),
        E("1302-07-11", "dag", "Guldensporenslag", "Vlaamse milities verslaan het Franse ridderleger bij Kortrijk.", "Vlaanderen blijft vrij van rechtstreeks Frans bestuur.", "https://warhistory.org/article/courtrai-1302?amp=0"),
        E("1305-06-23", "dag", "Verdrag van Athis-sur-Orge", "Na Pevelenberg sluiten Filips IV en Robrecht III vrede; Rijsel, Dowaai (en Orchies of Bethune) gaan naar de Franse kroon (definitief 1312/1320).", "Waals-Vlaanderen (rond Rijsel) Frans.", W + "Treaty_of_Athis-sur-Orge", True),
        E("1345-07-17", "jaar", "Moord op Jacob van Artevelde", "De Gentse leider die Vlaanderen sinds 1338 aan Engeland bond, wordt vermoord (1345; een bron zegt 1346; dag ONZEKER).", "Einde van de Gentse overmacht; graaf herstelt gezag.", "https://www.the-low-countries.com/article/the-rise-and-fall-of-brewer-of-ghent-jacob-van-artevelde/", True),
        E("1356-01-03", "dag", "Blijde Inkomst", "Johanna en Wenceslas van Brabant verlenen het voorrechtencharter.", "Grondwet-achtig charter; kort daarna valt Lodewijk van Male Brabant binnen.", "https://www.britannica.com/biography/Johanna"),
        E("1366-01-01", "jaar", "Loon bij Luik", "Na de Loonse Successieoorlogen wordt het graafschap Loon definitief bij het prinsbisdom gevoegd.", "Loon verdwijnt als zelfstandige macht.", W + "Battle_of_Baesweiler"),
        E("1369-06-19", "dag", "Huwelijk Margaretha van Male en Filips de Stoute", "Huwelijk in de Sint-Baafsabdij in Gent.", "Vlaanderen en Artesie zullen naar Bourgondie gaan.", "https://mdwiki.org/wiki/Louis_de_Male"),
        E("1371-08-22", "dag", "Slag bij Baesweiler", "Hertog Wenceslas van Brabant wordt verslagen en gevangen door Gulik en Gelre.", "Brabant verzwakt.", W + "Battle_of_Baesweiler"),
        E("1382-11-27", "dag", "Slag bij Westrozebeke", "Een Frans leger verslaat de Gentenaars; Filips van Artevelde sneuvelt.", "Gentse opstand gebroken in het veld, duurt nog tot 1385.", W + "Philip_van_Artevelde"),
    ],
    "versterkingen": [V("Gravensteen (Gent)", 51.06, 3.72), V("Brugge", 51.21, 3.22), V("Ieper", 50.85, 2.88), V("Kortrijk", 50.83, 3.26), V("Rijsel", 50.63, 3.06),
                      V("Brussel", 50.85, 4.35), V("Leuven", 50.88, 4.70), V("Limbourg", 50.61, 5.94), V("Luxemburg", 49.61, 6.13), V("Namen", 50.46, 4.87),
                      V("Bergen", 50.45, 3.95), V("Luik", 50.64, 5.57), V("Hoei", 50.52, 5.24), V("Bouillon", 49.79, 5.07), V("Calais (Engels vanaf 1347)", 50.95, 1.86)],
    "namen": ["Boudewijn", "Diederik", "Filips", "Gwijde", "Robrecht", "Lodewijk", "Ferrand", "Johanna", "Margaretha", "Godfried", "Hendrik", "Jan", "Walram", "Willem", "Arnold", "Wenceslas", "Hugo", "Adolf"],
    "dynastieen": ["Elzas (Vlaanderen)", "Dampierre (Vlaanderen, Namen)", "Leuven/Brabant (Reiniers)", "Avesnes (Henegouwen, Holland)", "Luxemburg (later keizers)", "Limburg", "Loon"],
})

# ---------------------------------------------------------------- 5 Bourgondiers
T.append({
    "id": "bourgondiers", "naam": "Bourgondiers", "van": "1384", "tot": "1482",
    "grens": "30 januari 1384 (dood Lodewijk van Male) tot 27 maart 1482 (dood Maria van Bourgondie).",
    "startmoment": "30 januari 1384",
    "bevolking": {"waarde": "geen betrouwbare schatting voor 1384 (ONZEKER); rond 1500 ±2,3 miljoen in de hele Nederlanden", "bron": "https://encyclopedia.com/international/encyclopedias-almanacs-transcripts-and-maps/low-countries"},
    "facties": [
        F("bourgondie", "Bourgondische Staat", "staat", "Filips de Stoute (hertog 1363-1404) met Margaretha van Male (gravin 1384-1405)", [WV, OV, ZVL, FVL, ART], "Rijsel (ONZEKER; het hof reisde)", 50.63, 3.06,
          oorlog=["gent"], heer="frankrijk", bron="https://mdwiki.org/wiki/Louis_de_Male", opm="Antwerpen en Mechelen waren toen Vlaams (sinds 1357, NIET NAGEKEKEN)."),
        F("gent", "Opstandig Gent", "staat", "Frans Ackerman (leider; NIET NAGEKEKEN)", [OV], "Gent", 51.05, 3.72, oorlog=["bourgondie", "frankrijk"], bond=["engeland"],
          bron=NN + W + "Revolt_of_Ghent_(1379%E2%80%931385)", opm="Gentse opstand 1379-1385."),
        F("brabant", "Hertogdom Brabant", "staat", "Johanna (hertogin 1355-1406)", [VB, BRU, WB, ANT, LUI], "Brussel", 50.85, 4.35, heer="duitserijk",
          bron="https://www.britannica.com/biography/Johanna", opm="Inclusief hertogdom Limburg (in provincie Luik)."),
        F("henegouwen", "Henegouwen (met Holland en Zeeland)", "staat", "Albrecht van Beieren (NIET NAGEKEKEN)", [HEN], "Bergen", 50.45, 3.95, heer="duitserijk", bron=NN + W + "Albert_I,_Duke_of_Bavaria"),
        F("namen", "Graafschap Namen", "staat", "Willem I (NIET NAGEKEKEN)", [NAM], "Namen", 50.46, 4.87, heer="duitserijk", bron=NN + W + "County_of_Namur"),
        F("luik", "Prinsbisdom Luik", "staat", "Arnold van Horne (NIET NAGEKEKEN)", [LUI, LIM, NAM], "Luik", 50.64, 5.57, heer="duitserijk", bron=NN + "https://www.wikipedia.org/wiki/Bishop_of_Liege"),
        F("luxemburg", "Hertogdom Luxemburg", "staat", "Wenceslas (Rooms-koning, ook hertog van Luxemburg; NIET NAGEKEKEN)", [GHL, LUX], "Luxemburg", 49.61, 6.13, heer="duitserijk", bron=NN + W + "Duchy_of_Luxembourg"),
        F("frankrijk", "Koninkrijk Frankrijk", "rijk", "Karel VI (1380-1422)", [AIS, FAR], "Parijs", 48.86, 2.35, oorlog=["engeland", "gent"], bond=["bourgondie"], bron=NN + W + "Charles_VI_of_France"),
        F("engeland", "Koninkrijk Engeland", "rijk", "Richard II (1377-1399)", [ART], "Londen", 51.51, -0.13, oorlog=["frankrijk"], bond=["gent"], bron=NN + W + "Richard_II_of_England", opm="Bezit Calais (sinds 1347)."),
        F("duitserijk", "Heilig Roomse Rijk", "rijk", "Wenceslas (Rooms-koning 1376-1400)", [], "Praag", 50.09, 14.42, bron=NN + W + "Wenceslaus_IV_of_Bohemia"),
    ],
    "gebeurtenissen": [
        E("1421-01-01", "jaar", "Aankoop van Namen", "Filips de Goede koopt het graafschap Namen; hij neemt het over in 1429.", "Namen Bourgondisch.", W + "County_of_Namur"),
        E("1430-08-04", "jaar", "Brabant en Limburg", "Filips van Saint-Pol sterft kinderloos; Filips de Goede erft Brabant, Limburg en het markgraafschap Antwerpen.", "Brabant en Limburg Bourgondisch.", "https://WWW.wikipedia.org/wiki/Philip_the_Good"),
        E("1433-04-12", "jaar", "Henegouwen, Holland en Zeeland", "Jacoba van Beieren moet haar graafschappen afstaan (1432 of 1433).", "Henegouwen Bourgondisch.", "https://www.wikipedia.com/wiki/Burgundian_Netherlands", True),
        E("1443-01-01", "jaar", "Luxemburg", "Filips de Goede verwerft Luxemburg van Elisabeth van Gorlitz (sommige bronnen 1441).", "Luxemburg Bourgondisch.", "https://thefreelancehistorywriter.com/?p=6083", True),
        E("1466-08-25", "dag", "Verwoesting van Dinant", "Karel (de Stoute) laat het opstandige Dinant verwoesten en burgers in de Maas werpen (een Franse bron zegt 1467).", "Luikse opstand afgestraft.", W + "Wars_of_Li%C3%A8ge", True),
        E("1467-10-28", "dag", "Slag bij Brustem", "Karel de Stoute verslaat de Luikenaars bij Sint-Truiden.", "Luik verliest zijn vrijheden.", W + "Battle_of_Brustem"),
        E("1468-10-30", "dag", "Plundering van Luik", "Na een nieuwe opstand neemt Karel Luik in en laat de stad in brand steken.", "Luik onder Bourgondische voogdij.", W + "Wars_of_Li%C3%A8ge"),
        E("1477-01-05", "dag", "Dood van Karel de Stoute", "Karel sneuvelt bij Nancy.", "Erfopvolgingscrisis; Frankrijk bezet Bourgondie en delen van Artesie.", "https://www.britannica.com/summary/Charles-duke-of-Burgundy"),
        E("1477-02-11", "dag", "Groot Privilege", "Maria van Bourgondie verleent de Staten-Generaal voorrechten (10 of 11 februari).", "Gewesten herwinnen rechten tegenover de vorst.", W + "Flemish_revolts_against_Maximilian_of_Austria", True),
        E("1477-08-19", "dag", "Huwelijk Maria en Maximiliaan", "Maria trouwt in Gent met Maximiliaan van Oostenrijk.", "De Nederlanden gaan naar de Habsburgers.", "https://www.encyclopedia.com/reference/encyclopedias-almanacs-transcripts-and-maps/mary-burgundy"),
        E("1479-08-07", "dag", "Slag bij Guinegate", "Een Habsburgs-Vlaams leger verslaat de Fransen.", "Franse opmars in Artesie gestuit.", W + "War_of_the_Burgundian_Succession"),
        E("1482-03-27", "dag", "Dood van Maria van Bourgondie", "Maria sterft na een val van haar paard.", "Haar zoon Filips (3 jaar) erft; strijd over het regentschap van Maximiliaan.", W + "Mary_of_Burgundy"),
    ],
    "versterkingen": [V("Gent", 51.05, 3.72), V("Brugge", 51.21, 3.22), V("Rijsel", 50.63, 3.06), V("Brussel", 50.85, 4.35), V("Namen", 50.46, 4.87),
                      V("Luxemburg", 49.61, 6.13), V("Luik", 50.64, 5.57), V("Dinant", 50.26, 4.91), V("Sint-Truiden", 50.82, 5.19), V("Calais (Engels)", 50.95, 1.86),
                      V("Atrecht (Arras)", 50.29, 2.78), V("Mechelen", 51.03, 4.48), V("Oudenaarde", 50.85, 3.60), V("Hoei", 50.52, 5.24)],
    "namen": ["Filips", "Jan", "Karel", "Antoon", "Margaretha", "Isabella", "Maria", "Jacoba", "Willem", "Albrecht", "Lodewijk", "Jan van Heinsberg", "Anton", "Adolf", "Cornelis (bastaard)"],
    "dynastieen": ["Valois-Bourgondie", "Wittelsbach (Beieren-Henegouwen)", "Luxemburg", "Habsburg (vanaf 1477)", "De la Marck"],
})

# ---------------------------------------------------------------- 6 Habsburgers en Spanje
T.append({
    "id": "habsburg_spanje", "naam": "Habsburgers en Spanje", "van": "1482", "tot": "1714",
    "grens": "27 maart 1482 tot het Verdrag van Rastatt (6 maart 1714).",
    "startmoment": "27 maart 1482",
    "bevolking": {"waarde": "±1,25 miljoen in het huidige Belgie (rond 1500); randgebieden niet inbegrepen (ruwe schatting)", "bron": "https://wikiwand.com/en/Demographics_of_Belgium"},
    "facties": [
        F("habsburg", "Habsburgse Nederlanden", "staat", "Filips de Schone (heer 1482-1506, minderjarig; regent Maximiliaan, betwist)", [OV, WV, ZVL, ANT, VB, BRU, WB, HEN, NAM, LUX, GHL, FVL, LIM, NLL], "Mechelen", 51.03, 4.48,
          oorlog=["frankrijk"], heer="duitserijk", bron=W + "Mary_of_Burgundy", opm="Limburg (B)/Nederlands-Limburg hier bedoeld als hertogdom Limburg en Landen van Overmaas; Luiks gebied apart."),
        F("vlaamsesteden", "Vlaamse Leden (Gent, Brugge, Ieper)", "staat", "regentschapsraad van de Vlaamse steden (ONZEKER als aparte macht)", [OV, WV], "Gent", 51.05, 3.72,
          oorlog=["habsburg"], bond=["frankrijk"], bron=W + "Flemish_revolts_against_Maximilian_of_Austria", opm="Strijd tegen Maximiliaan 1482-1492."),
        F("frankrijk", "Koninkrijk Frankrijk", "rijk", "Lodewijk XI (1461-1483)", [AIS, FAR, ART], "Parijs", 48.86, 2.35, oorlog=["habsburg"], bond=["vlaamsesteden"], bron=W + "Treaty_of_Arras_(1482)", opm="Bezet sinds 1477 delen van Artesie."),
        F("luik", "Prinsbisdom Luik", "staat", "Lodewijk van Bourbon (1456-1482, vermoord 30 augustus 1482)", [LUI, LIM, NAM, NLL], "Luik", 50.64, 5.57, heer="duitserijk", bron=W + "Louis_de_Bourbon_(bishop_of_Li%C3%A8ge)"),
        F("duitserijk", "Heilig Roomse Rijk", "rijk", "keizer Frederik III (1452-1493)", [], "Wiener Neustadt", 47.81, 16.24, bond=["habsburg"], bron=NN + W + "Frederick_III,_Holy_Roman_Emperor"),
        F("engeland", "Koninkrijk Engeland", "rijk", "Edward IV (1461-1483)", [ART], "Londen", 51.51, -0.13, bron=NN + W + "Edward_IV_of_England", opm="Calais Engels tot 1558."),
    ],
    "gebeurtenissen": [
        E("1482-12-23", "dag", "Vrede van Atrecht", "Maximiliaan moet Artesie en Picardie aan Frankrijk laten (Artesie kwam in 1493 grotendeels terug, NIET NAGEKEKEN).", "Grens met Frankrijk verschuift tijdelijk naar het noorden.", W + "Treaty_of_Arras_(1482)"),
        E("1500-02-24", "dag", "Geboorte van Karel V", "Karel wordt in het Prinsenhof in Gent geboren.", "Erfgenaam van Bourgondie, Spanje en Oostenrijk.", "https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm"),
        E("1529-08-03", "maand", "Damesvrede van Kamerijk", "Frans I erkent Karel als heer van de Nederlanden en ziet af van leenheerschap over Vlaanderen en Artesie (2/3 augustus; Artesie niet bevestigd).", "Vlaanderen en Artesie niet langer Frans leen.", "https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm", True),
        E("1549-11-04", "jaar", "Pragmatieke Sanctie", "Karel V verklaart de Zeventien Provincien tot een ondeelbaar geheel met dezelfde erfopvolging (dag NIET NAGEKEKEN).", "De Nederlanden blijven samen bij een vorst.", "https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm"),
        E("1555-10-25", "dag", "Troonsafstand in Brussel", "Karel V draagt de Nederlanden over aan zijn zoon Filips II.", "De Nederlanden onder de Spaanse tak.", "https://www.thecollector.com/charles-v-holy-roman-emperor/"),
        E("1566-08-10", "dag", "Beeldenstorm", "In de Westhoek (Steenvoorde) begint de Beeldenstorm (plaats niet bevestigd in bron).", "Begin van de Opstand; Alva wordt gestuurd.", "https://www.wikipedia.com/wiki/Battles_of_the_Eighty_Years%27_War"),
        E("1585-08-17", "dag", "Val van Antwerpen", "Farnese neemt Antwerpen in na een lang beleg; protestanten moeten bekeren of vertrekken.", "Zuiden blijft Spaans; scheiding met het Noorden.", "https://britannica.com/event/Battle-of-Antwerp"),
        E("1609-04-09", "dag", "Twaalfjarig Bestand", "Wapenstilstand tussen Spanje en de Republiek, getekend in Antwerpen.", "Twaalf jaar vrede; grens in Zeeuws-Vlaanderen en Brabant bevriest.", "https://www.worldhistory.org/Eighty_Years'_War/"),
        E("1648-01-30", "dag", "Vrede van Munster", "Spanje erkent de Republiek; de Schelde blijft gesloten.", "Zeeuws-Vlaanderen en Maastricht bij de Republiek; Antwerpen afgesneden.", "https://www.worldhistory.org/Eighty_Years'_War/"),
        E("1659-11-07", "jaar", "Vrede van de Pyreneeen", "Frankrijk krijgt het grootste deel van Artesie (dag NIET NAGEKEKEN).", "Artesie Frans.", "https://courses.lumenlearning.com/suny-worldhistory/chapter/louis-xivs-wars/"),
        E("1668-05-02", "dag", "Vrede van Aken", "Frankrijk houdt o.a. Rijsel, Doornik, Kortrijk, Oudenaarde, Veurne en Charleroi.", "Grote Franse winst in Vlaanderen en Henegouwen.", "https://ipfs.aleph.im/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/Treaty_of_Aix-la-Chapelle_(1668).html"),
        E("1678-09-17", "dag", "Vrede van Nijmegen", "Frankrijk krijgt Sint-Omaars, Kassel, Ieper, Kamerijk en Valenciennes; geeft o.a. Kortrijk, Oudenaarde, Charleroi terug.", "Grens begint op de huidige Frans-Belgische grens te lijken.", "https://www.wikipedia.com/wiki/Peace_of_Nijmegen"),
        E("1697-09-20", "jaar", "Vrede van Rijswijk", "Gebieden die Frankrijk in de Negenjarige Oorlog nam, gaan terug naar Spanje (dag en lijst NIET NAGEKEKEN).", "Herstel van de grens van 1678 met kleine wijzigingen.", "https://webcf.waybackmachine.org/web/20220504161456/https://en.wikipedia.org/wiki/Spanish_Netherlands", True),
        E("1706-05-23", "dag", "Slag bij Ramillies", "Marlborough verslaat de Fransen.", "Bondgenoten bezetten de Spaanse Nederlanden.", "https://weaponsandwarfare.com/?p=8335"),
        E("1708-07-11", "dag", "Slag bij Oudenaarde", "Marlborough en Eugenius verslaan de Fransen; daarna beleg en val van Rijsel.", "Franse greep op Vlaanderen verzwakt.", "https://www.timewisetraveller.co.uk/warss.html"),
        E("1709-09-11", "dag", "Slag bij Malplaquet", "Bloedige, weinig beslissende overwinning van de bondgenoten.", "Uitputting; weg naar vrede.", "https://www.timewisetraveller.co.uk/warss.html"),
        E("1713-04-11", "dag", "Vrede van Utrecht", "Einde van de Spaanse Successieoorlog tussen Frankrijk en de meeste bondgenoten (datum niet bevestigd in de gevonden bron).", "Spaanse Nederlanden bestemd voor Oostenrijk.", "https://nam.ac.uk/explore/spanish-succession", True),
        E("1714-03-06", "dag", "Vrede van Rastatt", "Oostenrijk sluit vrede met Frankrijk en krijgt de Zuidelijke Nederlanden.", "Begin Oostenrijkse Nederlanden.", "https://nam.ac.uk/explore/spanish-succession"),
    ],
    "versterkingen": [V("Citadel van Antwerpen", 51.21, 4.39), V("Spanjaardenkasteel Gent", 51.06, 3.74), V("Citadel van Namen", 50.46, 4.86), V("Charlemont (Givet)", 50.14, 4.83),
                      V("Philippeville", 50.20, 4.54), V("Mariembourg", 50.09, 4.52), V("Oostende", 51.23, 2.92), V("Sluis", 51.31, 3.39), V("Hulst", 51.28, 4.05),
                      V("Maastricht", 50.85, 5.69), V("Citadel van Rijsel", 50.64, 3.04), V("Doornik", 50.61, 3.39), V("Ieper", 50.85, 2.88), V("Luxemburg", 49.61, 6.13),
                      V("Duinkerke", 51.03, 2.38), V("Kamerijk", 50.18, 3.23), V("Charleroi", 50.41, 4.44)],
    "namen": ["Filips", "Karel", "Maximiliaan", "Margaretha", "Maria", "Ferdinand", "Albrecht", "Isabella", "Alexander", "Fernando", "Juan", "Jan", "Willem", "Lamoraal", "Filips van Montmorency", "Leopold Willem", "Maximiliaan Emanuel"],
    "dynastieen": ["Habsburg (Spaanse tak)", "Valois en Bourbon (Frankrijk)", "Oranje-Nassau (Republiek)", "Egmont, Horne, Croy, Arenberg (adel)", "Wittelsbach (prins-bisschoppen van Luik)"],
})

# ---------------------------------------------------------------- 7 Oostenrijk
T.append({
    "id": "oostenrijk", "naam": "Oostenrijk", "van": "1714", "tot": "1795",
    "grens": "6 maart 1714 (Rastatt) tot de annexatie door Frankrijk (1 oktober 1795). Fleurus (26 juni 1794) valt aan het einde van dit tijdperk.",
    "startmoment": "6 maart 1714",
    "bevolking": {"waarde": "±1,75 miljoen in het huidige Belgie (rond 1700); ruwe schatting", "bron": "https://wikiwand.com/en/Demographics_of_Belgium"},
    "facties": [
        F("oostenrijk", "Oostenrijkse Nederlanden", "staat", "keizer Karel VI (1711-1740); landvoogd vanaf 1716 prins Eugenius, waargenomen door markies de Prie (NIET NAGEKEKEN)", [WV, OV, ANT, VB, BRU, WB, HEN, NAM, LUX, GHL], "Brussel", 50.85, 4.35,
          bond=["republiek", "grootbrittannie"], bron="https://nam.ac.uk/explore/spanish-succession", opm="Tot 1716 nog onder Brits-Staatse voogdij (ONZEKER)."),
        F("republiek", "Republiek der Verenigde Nederlanden", "staat", "geen stadhouder (raadpensionaris Heinsius, NIET NAGEKEKEN)", [ZVL, NLL], "Den Haag", 52.08, 4.31, bond=["oostenrijk", "grootbrittannie"],
          bron=NN + W + "Barrier_Treaty", opm="Mag barrierevestingen bezetten; Maastricht gedeeld met Luik."),
        F("frankrijk", "Koninkrijk Frankrijk", "rijk", "Lodewijk XIV (1643-1715)", [FVL, ART, AIS, FAR], "Versailles", 48.80, 2.12, bron=NN + W + "Louis_XIV"),
        F("luik", "Prinsbisdom Luik", "staat", "Jozef Clemens van Beieren (1694-1723)", [LUI, LIM, NAM], "Luik (bisschop zetelde meestal in Bonn)", 50.64, 5.57, heer="duitserijk",
          bron="https://en.Wikipedia.com/wiki/Clement_Joseph_of_Bavaria"),
        F("grootbrittannie", "Groot-Brittannie", "rijk", "koningin Anna (1702-1714)", [], "Londen", 51.51, -0.13, bond=["oostenrijk", "republiek"], bron=NN + W + "Anne,_Queen_of_Great_Britain"),
        F("duitserijk", "Heilig Roomse Rijk", "rijk", "keizer Karel VI (zelfde vorst als Oostenrijk)", [], "Wenen", 48.21, 16.37, bron=NN + W + "Charles_VI,_Holy_Roman_Emperor"),
    ],
    "gebeurtenissen": [
        E("1715-11-15", "jaar", "Derde Barriereverdrag", "De Republiek krijgt garnizoensrecht in een rij vestingen in de Oostenrijkse Nederlanden (dag NIET NAGEKEKEN).", "Staatse troepen in o.a. Namen, Doornik, Menen, Ieper, Veurne.", NN + W + "Barrier_Treaty", True),
        E("1745-05-11", "dag", "Slag bij Fontenoy", "Frankrijk verslaat de bondgenoten bij Doornik.", "Frankrijk bezet tegen eind 1745 een groot deel van de Oostenrijkse Nederlanden.", "https://www.britannica.com/facts/Battle-of-Fontenoy"),
        E("1748-10-18", "dag", "Vrede van Aken", "Einde Oostenrijkse Successieoorlog; Frankrijk geeft zijn veroveringen terug.", "Oostenrijks gezag hersteld.", "https://britannica.com/facts/Treaty-of-Aix-la-Chapelle"),
        E("1780-11-29", "jaar", "Jozef II alleenheerser", "Na de dood van Maria Theresia regeert Jozef II alleen (dag NIET NAGEKEKEN).", "Begin van ingrijpende hervormingen.", NN + W + "Joseph_II,_Holy_Roman_Emperor", True),
        E("1787-01-01", "jaar", "Bestuurshervormingen van Jozef II", "Jozef II vervangt oude raden en rechtbanken door een nieuw stelsel (NIET NAGEKEKEN).", "Verzet van Staten en Kerk.", NN + W + "Brabant_Revolution", True),
        E("1789-08-18", "dag", "Luikse Revolutie", "Opstand tegen de prins-bisschop van Luik.", "Republiek Luik tot herstel van het prinsbisdom (1791).", "https://www.wikipedia.com/wiki/Li%C3%A8ge_Revolution"),
        E("1789-10-27", "dag", "Slag bij Turnhout", "Patriotten verslaan Oostenrijkse troepen; begin van de Brabantse Omwenteling (start ook 24 oktober genoemd).", "Oostenrijkers verdreven uit het grootste deel van het land.", "https://Wikipedia.com/wiki/Brabant_Revolution"),
        E("1790-01-11", "dag", "Verenigde Belgische Staten", "De Staten sluiten een verbond met een Soeverein Congres.", "Korte onafhankelijkheid tot Oostenrijks herstel eind 1790.", "https://www.Wikipedia.org/wiki/United_Belgium_States"),
        E("1792-11-06", "dag", "Slag bij Jemappes", "Een Frans revolutieleger verslaat de Oostenrijkers.", "Eerste Franse bezetting.", "https://brusselstimes.com/593353/excuse-my-french-belgium-before-waterloo"),
        E("1793-03-18", "dag", "Slag bij Neerwinden", "De Oostenrijkers verslaan de Fransen.", "Oostenrijks gezag kort hersteld.", "https://www.worldhistory.org/Battle_of_Neerwinden/.md"),
        E("1794-06-26", "dag", "Slag bij Fleurus", "Jourdan verslaat de bondgenoten.", "Definitieve Franse verovering.", "https://Www.wikipedia.org/wiki/Invasion_of_France_(1794)"),
    ],
    "versterkingen": [V("Namen", 50.46, 4.86), V("Doornik", 50.61, 3.39), V("Menen", 50.80, 3.12), V("Veurne", 51.07, 2.66), V("Waasten (Warneton)", 50.75, 2.95),
                      V("Ieper", 50.85, 2.88), V("Fort Knokke (bij Lo-Reninge, ONZEKER)", 50.95, 2.80), V("Dendermonde", 51.03, 4.10), V("Luxemburg", 49.61, 6.13),
                      V("Maastricht", 50.85, 5.69), V("Rijsel (Frans)", 50.64, 3.04), V("Bergen", 50.45, 3.95), V("Charleroi", 50.41, 4.44), V("Ath", 50.63, 3.78),
                      V("Oudenaarde", 50.85, 3.60), V("Citadel van Antwerpen", 51.21, 4.39)],
    "namen": ["Karel", "Maria Theresia", "Jozef", "Leopold", "Frans", "Maria Elisabeth", "Karel Alexander", "Albert", "Maria Christina", "Hendrik van der Noot", "Jan Frans Vonck", "Frans Karel", "Cesar Constantijn", "Georges-Louis"],
    "dynastieen": ["Habsburg-Lotharingen", "Bourbon (Frankrijk)", "Oranje-Nassau", "Hannover (Groot-Brittannie)", "Wittelsbach en De Velbruck/De Hoensbroeck (Luik)"],
})

# ---------------------------------------------------------------- 8 Frankrijk en VK
T.append({
    "id": "frankrijk_vk", "naam": "Frankrijk en Verenigd Koninkrijk", "van": "1795", "tot": "1830",
    "grens": "1 oktober 1795 (annexatie) tot 4 oktober 1830 (onafhankelijkheidsverklaring). Alternatief: start op 26 juni 1794 (Fleurus).",
    "startmoment": "1 oktober 1795",
    "bevolking": {"waarde": "±3 tot 3,5 miljoen in het huidige Belgie (rond 1800; ONZEKER)", "bron": "https://wikiwand.com/en/Demographics_of_Belgium"},
    "facties": [
        F("frankrijk", "Franse Republiek", "rijk", "Nationale Conventie, vanaf eind oktober/november 1795 het Directoire (NIET NAGEKEKEN)", ALLES, "Parijs", 48.86, 2.35,
          oorlog=["oostenrijk", "grootbrittannie"], bond=["bataafserepubliek"], bron="https://brusselstimes.com/593353/excuse-my-french-belgium-before-waterloo",
          opm="Zeeuws-Vlaanderen en Maastricht via het Verdrag van Den Haag (1795, NIET NAGEKEKEN); Luxemburg-stad gaf zich in 1795 over (NIET NAGEKEKEN)."),
        F("bataafserepubliek", "Bataafse Republiek", "staat", "Nationale Vergadering (NIET NAGEKEKEN)", [], "Den Haag", 52.08, 4.31, bond=["frankrijk"], oorlog=["grootbrittannie"], bron=NN + W + "Batavian_Republic"),
        F("oostenrijk", "Oostenrijk (Habsburgse monarchie)", "rijk", "keizer Frans II (1792-1835)", [], "Wenen", 48.21, 16.37, oorlog=["frankrijk"], bond=["grootbrittannie"], bron=NN + W + "Francis_II,_Holy_Roman_Emperor"),
        F("grootbrittannie", "Groot-Brittannie", "rijk", "George III (1760-1820)", [], "Londen", 51.51, -0.13, oorlog=["frankrijk", "bataafserepubliek"], bond=["oostenrijk"], bron=NN + W + "George_III"),
        F("pruisen", "Pruisen", "rijk", "Frederik Willem II (1786-1797)", [], "Berlijn", 52.52, 13.40, bron=NN + W + "Peace_of_Basel", opm="Sinds de Vrede van Bazel (1795) neutraal."),
    ],
    "gebeurtenissen": [
        E("1795-10-01", "dag", "Annexatie bij Frankrijk", "De Conventie lijft de Zuidelijke Nederlanden en het prinsbisdom Luik in.", "Indeling in departementen (o.a. Leie, Schelde, Twee Neten, Dijle, Jemappes, Samber-en-Maas, Ourthe, Neder-Maas, Wouden); aantal 9 NIET bevestigd.", "https://www.dbnl.org/tekst/koss002lage01_01/koss002lage01_01_0007.php", True),
        E("1797-10-17", "dag", "Vrede van Campo Formio", "Oostenrijk erkent het verlies van de Nederlanden (NIET NAGEKEKEN).", "Franse annexatie internationaal erkend.", NN + W + "Treaty_of_Campo_Formio", True),
        E("1798-10-12", "dag", "Boerenkrijg", "Opstand op het platteland tegen de dienstplicht en het Franse bewind; neergeslagen tot 5 december 1798 (Hasselt).", "Harde repressie; geen gebiedswijziging.", W + "1798_in_Belgium"),
        E("1814-02-01", "jaar", "Einde Franse bewind", "Bondgenoten verdrijven de Fransen uit de Zuidelijke Nederlanden (NIET NAGEKEKEN).", "Voorlopig geallieerd bestuur.", NN + W + "United_Kingdom_of_the_Netherlands", True),
        E("1815-03-16", "dag", "Willem I koning", "Willem I roept zich uit tot koning van het Verenigd Koninkrijk der Nederlanden (datum niet bevestigd in bron).", "Noord en Zuid samen in een staat; Luxemburg groothertogdom in personele unie.", "https://www.Britannica.Com/event/Napoleonic-Wars/The-Congress-of-Vienna-and-the-Hundred-Days", True),
        E("1815-06-09", "dag", "Slotakte van Wenen", "Ondertekening van de slotakte van het Congres (een bron zegt 8 juni).", "Grenzen van het nieuwe koninkrijk vastgelegd.", "https://www.Britannica.Com/event/Napoleonic-Wars/The-Congress-of-Vienna-and-the-Hundred-Days", True),
        E("1815-06-16", "dag", "Ligny en Quatre-Bras", "Napoleon verslaat de Pruisen bij Ligny; bij Quatre-Bras houdt Wellington stand.", "Pruisen trekken terug, Wellington ook.", "https://Www.wikipedia.org/wiki/Waterloo_Campaign"),
        E("1815-06-18", "dag", "Slag bij Waterloo", "Wellington en Blucher verslaan Napoleon.", "Einde van Napoleon; Verenigd Koninkrijk der Nederlanden zeker.", "https://www.wikipedia.org/wiki/Waterloo_Battle"),
        E("1815-11-20", "dag", "Tweede Vrede van Parijs", "Frankrijk staat o.a. Philippeville, Mariembourg en Bouillon af (NIET NAGEKEKEN).", "Huidige zuidgrens bijna bereikt.", NN + W + "Treaty_of_Paris_(1815)", True),
    ],
    "versterkingen": [V("Citadel van Antwerpen", 51.21, 4.39), V("Luxemburg (bondsvesting)", 49.61, 6.13), V("Ieper", 50.85, 2.88), V("Menen", 50.80, 3.12),
                      V("Oudenaarde", 50.85, 3.60), V("Doornik", 50.61, 3.39), V("Ath", 50.63, 3.78), V("Bergen", 50.45, 3.95), V("Charleroi", 50.41, 4.44),
                      V("Namen", 50.46, 4.86), V("Hoei", 50.52, 5.24), V("Citadel van Luik", 50.65, 5.57), V("Dinant", 50.26, 4.91), V("Oostende", 51.23, 2.92),
                      V("Nieuwpoort", 51.13, 2.75), V("Citadel van Gent", 51.04, 3.72), V("Maastricht", 50.85, 5.69)],
    "namen": ["Napoleon", "Lodewijk", "Willem", "Frederik", "Karel", "Pieter", "Jan", "Emmanuel", "Hendrik", "Lieven Bauwens", "Pieter Corbeels", "Emmanuel Rollier", "Gijsbert Karel", "Joseph"],
    "dynastieen": ["Bonaparte", "Oranje-Nassau", "Bourbon (restauratie)", "Habsburg-Lotharingen", "Hohenzollern"],
})

# ---------------------------------------------------------------- 9 Belgie
T.append({
    "id": "belgie", "naam": "Belgie", "van": "1830", "tot": "1914",
    "grens": "Start 4 oktober 1830 (Voorlopig Bewind verklaart onafhankelijkheid); de opstand begon op 25 augustus 1830.",
    "startmoment": "4 oktober 1830",
    "bevolking": {"waarde": "±4,1 miljoen (1831)", "bron": "https://tacitus.nu/historical-atlas/population/benelux.htm"},
    "facties": [
        F("belgie", "Belgie (Voorlopig Bewind)", "staat", "Voorlopig Bewind (o.a. Charles Rogier); regent Surlet de Chokier vanaf februari 1831; Leopold I vanaf 21 juli 1831 (NIET NAGEKEKEN behalve Leopold)", [WV, OV, VB, BRU, WB, HEN, NAM, LUI, LIM, LUX, ANT, NLL, GHL], "Brussel", 50.85, 4.35,
          oorlog=["nederland"], bron="https://Wikipedia.com/wiki/Belgian_Revolution", opm="Controleert ook het grootste deel van Limburg en Luxemburg tot 1839, maar niet de vestingen."),
        F("nederland", "Verenigd Koninkrijk der Nederlanden", "staat", "Willem I (1815-1840)", [ZVL, NLL, GHL, ANT], "Den Haag", 52.08, 4.31, oorlog=["belgie"],
          bron="https://Wikipedia.com/wiki/Belgian_Revolution", opm="Houdt de citadel van Antwerpen (tot december 1832, NIET NAGEKEKEN), Maastricht en (met Pruisisch garnizoen) de vesting Luxemburg."),
        F("frankrijk", "Frankrijk", "rijk", "Lodewijk Filips (1830-1848)", [FVL, ART, AIS, FAR], "Parijs", 48.86, 2.35, bond=["belgie"], bron="https://Wikipedia.com/wiki/Belgian_Revolution"),
        F("grootbrittannie", "Verenigd Koninkrijk", "rijk", "Willem IV (1830-1837)", [], "Londen", 51.51, -0.13, bron=NN + W + "William_IV"),
        F("pruisen", "Pruisen", "rijk", "Frederik Willem III (1797-1840)", [], "Berlijn", 52.52, 13.40, bond=["nederland"], bron=NN + W + "Frederick_William_III_of_Prussia"),
    ],
    "gebeurtenissen": [
        E("1831-07-21", "dag", "Eed van Leopold I", "Leopold van Saksen-Coburg legt de eed af als koning der Belgen.", "Belgie wordt erfelijke grondwettelijke monarchie.", "https://Wikipedia.com/wiki/Belgian_Revolution"),
        E("1831-08-02", "dag", "Tiendaagse Veldtocht", "Het Nederlandse leger valt Belgie binnen (2-12 augustus) en wint, maar trekt terug voor een Frans leger.", "Belgie overleeft dankzij Frankrijk; zwakkere onderhandelingspositie.", "https://Wikipedia.com/wiki/Belgian_Revolution"),
        E("1839-04-19", "dag", "Verdrag van Londen", "Nederland erkent Belgie; Limburg en Luxemburg worden gesplitst.", "Oost-Limburg (met Maastricht) en het oosten van Luxemburg (Groothertogdom) naar Willem I.", "https://Wikipedia.com/wiki/Belgian_Revolution"),
        E("1835-05-05", "dag", "Eerste spoorlijn", "Spoorlijn Brussel-Mechelen geopend (NIET NAGEKEKEN).", "Begin van een snel groeiend spoornet; industrie in Henegouwen en Luik.", NN + W + "Rail_transport_in_Belgium", True),
        E("1879-07-01", "dag", "Eerste schoolstrijd", "De liberale wet-Van Humbeeck maakt het lager onderwijs neutraal (1 of 10 juli 1879).", "Katholiek verzet; in 1884 draait een katholieke regering de wet terug.", "https://wikipedia.com/wiki/First_School_War", True),
        E("1885-07-01", "dag", "Congo-Vrijstaat", "Na de Conferentie van Berlijn wordt Leopold II persoonlijk vorst van de Congo-Vrijstaat (naam 29 mei, start 1 juli 1885).", "Persoonlijke kolonie; dwangarbeid en geweld (rubberregime) kosten zeer veel levens.", "https://www.britannica.com/place/Congo-Free-State"),
        E("1893-04-18", "jaar", "Algemeen meervoudig stemrecht", "Alle mannen krijgen stemrecht, sommigen met extra stemmen (dag NIET NAGEKEKEN).", "Arbeiderspartij in het parlement.", NN + W + "Elections_in_Belgium", True),
        E("1908-11-15", "dag", "Belgisch-Congo", "Belgie neemt de Congo-Vrijstaat over (Kamer 20 augustus, Senaat 9 september, overdracht 15 november 1908).", "Kolonie onder Belgische staat; het bewind blijft uitbuitend.", W + "Congo_Free_State"),
        E("1909-12-17", "dag", "Albert I koning", "Leopold II sterft; Albert I volgt op (dag NIET NAGEKEKEN).", "Nieuwe koning voor de Eerste Wereldoorlog.", NN + W + "Albert_I_of_Belgium", True),
    ],
    "versterkingen": [V("Antwerpen (nationaal reduit, Brialmont)", 51.22, 4.40), V("Forten van Luik (o.a. Loncin)", 50.67, 5.50), V("Forten van Namen", 50.46, 4.87),
                      V("Diest", 50.99, 5.05), V("Dendermonde", 51.03, 4.10), V("Maastricht (Nederlands)", 50.85, 5.69), V("Luxemburg (ontmanteld na 1867)", 49.61, 6.13),
                      V("Rijsel (Frans)", 50.64, 3.04), V("Maubeuge (Frans)", 50.28, 3.97), V("Hoei", 50.52, 5.24)],
    "namen": ["Leopold", "Albert", "Filips", "Boudewijn", "Charles", "Jules", "Auguste", "Walthere", "Paul", "Louise", "Charlotte", "Clementine", "Marie-Henriette", "Elisabeth", "Victor", "Emile"],
    "dynastieen": ["Saksen-Coburg en Gotha (Belgie)", "Oranje-Nassau (Nederland, Luxemburg tot 1890)", "Nassau-Weilburg (Luxemburg vanaf 1890)", "Orleans/Bonaparte (Frankrijk)", "Hohenzollern"],
})

# ---------------------------------------------------------------- 10 Wereldoorlogen
T.append({
    "id": "wereldoorlogen", "naam": "Wereldoorlogen", "van": "1914", "tot": "1945",
    "grens": "4 augustus 1914 (Duitse inval) tot 8 mei 1945.",
    "startmoment": "4 augustus 1914",
    "bevolking": {"waarde": "±7,4 tot 7,6 miljoen (ruwe schatting; telling 1910 ±7,4 miljoen NIET NAGEKEKEN)", "bron": "https://wikiwand.com/en/Demographics_of_Belgium"},
    "facties": [
        F("belgie", "Belgie", "staat", "Albert I (1909-1934)", BE, "Brussel (regering later in Sainte-Adresse, koning in De Panne)", 50.85, 4.35,
          oorlog=["duitsland"], bond=["frankrijk", "grootbrittannie"], bron="https://encyclopedia.1914-1918-online.net/article/belgium", opm="Neutraal tot de inval; daarna strijdend naast de Entente."),
        F("duitsland", "Duitse Keizerrijk", "rijk", "keizer Wilhelm II (1888-1918)", [], "Berlijn", 52.52, 13.40, oorlog=["belgie", "frankrijk", "grootbrittannie"], bron="https://encyclopedia.1914-1918-online.net/article/belgium"),
        F("frankrijk", "Frankrijk", "rijk", "president Raymond Poincare (1913-1920)", [FVL, ART, AIS, FAR], "Parijs", 48.86, 2.35, oorlog=["duitsland"], bond=["belgie", "grootbrittannie"], bron=NN + W + "Raymond_Poincar%C3%A9"),
        F("grootbrittannie", "Verenigd Koninkrijk", "rijk", "George V (1910-1936)", [], "Londen", 51.51, -0.13, oorlog=["duitsland"], bond=["belgie", "frankrijk"], bron=NN + W + "George_V"),
        F("nederland", "Nederland", "staat", "Wilhelmina (1890-1948)", [ZVL, NLL], "Den Haag", 52.08, 4.31, bron=NN + W + "Wilhelmina_of_the_Netherlands", opm="Neutraal in WO I."),
        F("luxemburg", "Groothertogdom Luxemburg", "staat", "Marie-Adelaide (1912-1919)", [GHL], "Luxemburg", 49.61, 6.13, heer="duitsland", bron=NN + W + "Marie-Ad%C3%A9la%C3%AFde,_Grand_Duchess_of_Luxembourg", opm="Door Duitsland bezet sinds 2 augustus 1914 (NIET NAGEKEKEN); als 'heer' ingevuld."),
    ],
    "gebeurtenissen": [
        E("1914-08-04", "dag", "Duitse inval", "Het Duitse leger valt Belgie binnen.", "Belgie in oorlog; Groot-Brittannie verklaart Duitsland de oorlog.", "https://encyclopedia.1914-1918-online.net/article/belgium"),
        E("1914-08-16", "dag", "Laatste fort van Luik valt", "Het laatste fort rond Luik geeft zich over.", "Weg naar Brussel en Frankrijk open.", "https://encyclopedia.1914-1918-online.net/article/belgium"),
        E("1914-08-25", "maand", "Geweld tegen burgers", "Duitse troepen doden in augustus 1914 honderden burgers (o.a. Dinant, Leuven met de universiteitsbibliotheek) (data NIET NAGEKEKEN).", "Internationale verontwaardiging; geen gebiedswijziging.", NN + W + "Rape_of_Belgium", True),
        E("1914-10-10", "dag", "Val van Antwerpen", "Antwerpen valt; het Belgische leger trekt terug naar de IJzer (datum niet bevestigd in bron).", "Bijna heel Belgie bezet.", "https://www.Wikipedia.org/wiki/Antwerp_expedition", True),
        E("1914-10-18", "maand", "Slag aan de IJzer", "Het Belgische leger houdt stand tussen Nieuwpoort en Diksmuide; onderwaterzetting stopt de Duitsers (dagen NIET NAGEKEKEN).", "Klein stukje West-Vlaanderen blijft vrij tot 1918.", W + "Battle_of_the_Yser", True),
        E("1918-11-11", "dag", "Wapenstilstand", "Einde van de gevechten (NIET NAGEKEKEN in deze ronde, algemeen bekend).", "Belgie bevrijd; in 1920 Eupen-Malmedy bij Belgie.", NN + W + "Armistice_of_11_November_1918", True),
        E("1940-05-10", "dag", "Achttiendaagse Veldtocht", "Duitsland valt Belgie aan; Eben-Emael valt op de eerste dag door een luchtlanding.", "Snelle Duitse opmars.", "https://www.britannica.com/event/Battle-of-France-World-War-II/The-Battle-of-Belgium-and-the-defense-of-the-Channel-ports-May-10-June-4-1940"),
        E("1940-05-28", "dag", "Capitulatie", "Het Belgische leger capituleert, tegen het advies van de regering in.", "Bezetting; Eupen-Malmedy door Duitsland ingelijfd; collaboratie en verzet.", "https://m.ww2db.com/country/belgium"),
        E("1944-09-03", "dag", "Bevrijding van Brussel", "Geallieerde troepen bevrijden Brussel; Antwerpen volgt op 4 september (Antwerpen niet bevestigd in bron).", "Grootste deel van Belgie vrij.", "https://m.ww2db.com/country/belgium", True),
        E("1944-12-16", "dag", "Ardennenoffensief", "Duits tegenoffensief in de Ardennen (tot 28 januari 1945).", "Tijdelijk verlies van delen van Luxemburg (B) en Luik; Bastogne omsingeld (NIET NAGEKEKEN).", "https://m.ww2db.com/country/belgium"),
    ],
    "versterkingen": [V("Fort van Loncin (Luik)", 50.67, 5.50), V("Forten van Namen", 50.46, 4.87), V("Antwerpen", 51.22, 4.40), V("Eben-Emael", 50.80, 5.68),
                      V("Fort van Battice", 50.65, 5.82), V("Maubeuge (Frans)", 50.28, 3.97), V("IJzerfront Nieuwpoort", 51.13, 2.75), V("Diksmuide", 51.03, 2.86),
                      V("Ieper", 50.85, 2.88), V("Bastogne", 50.00, 5.72), V("KW-linie (Koningshooikt-Waver)", 51.00, 4.60)],
    "namen": ["Albert", "Leopold", "Elisabeth", "Astrid", "Charles", "Hubert", "Paul-Henri", "Achille", "Camille", "Adolphe", "August", "Gerard", "Wilhelm", "Hendrik", "Marie-Jose"],
    "dynastieen": ["Saksen-Coburg (Belgie)", "Hohenzollern (tot 1918)", "Windsor", "Oranje-Nassau", "Nassau-Weilburg (Luxemburg)"],
})

# ---------------------------------------------------------------- 11 Na de oorlog
T.append({
    "id": "na_de_oorlog", "naam": "Na de oorlog", "van": "1945", "tot": "2026",
    "grens": "8 mei 1945 tot nu.",
    "startmoment": "8 mei 1945",
    "bevolking": {"waarde": "±8,3 miljoen (ruwe schatting, NIET NAGEKEKEN)", "bron": "https://wikiwand.com/en/Demographics_of_Belgium"},
    "facties": [
        F("belgie", "Belgie", "staat", "prins-regent Karel (1944-1950); koning Leopold III net bevrijd uit Duitse gevangenschap (NIET NAGEKEKEN)", BE, "Brussel", 50.85, 4.35,
          bond=["nederland", "luxemburg", "frankrijk", "grootbrittannie", "verenigdestaten"], bron=W + "Royal_question"),
        F("nederland", "Nederland", "staat", "Wilhelmina (1890-1948)", [ZVL, NLL], "Den Haag", 52.08, 4.31, bond=["belgie", "luxemburg"], bron=NN + W + "Wilhelmina_of_the_Netherlands"),
        F("luxemburg", "Groothertogdom Luxemburg", "staat", "Charlotte (1919-1964)", [GHL], "Luxemburg", 49.61, 6.13, bond=["belgie", "nederland"], bron=NN + W + "Charlotte,_Grand_Duchess_of_Luxembourg"),
        F("frankrijk", "Frankrijk", "rijk", "Charles de Gaulle (voorlopige regering 1944-1946)", [FVL, ART, AIS, FAR], "Parijs", 48.86, 2.35, bond=["belgie"], bron=NN + W + "Provisional_Government_of_the_French_Republic"),
        F("grootbrittannie", "Verenigd Koninkrijk", "rijk", "George VI (1936-1952)", [], "Londen", 51.51, -0.13, bond=["belgie"], bron=NN + W + "George_VI"),
        F("verenigdestaten", "Verenigde Staten", "rijk", "president Harry Truman (1945-1953)", [], "Washington", 38.90, -77.04, bond=["belgie"], bron=NN + W + "Harry_S._Truman"),
    ],
    "gebeurtenissen": [
        E("1950-03-12", "dag", "Volksraadpleging Koningskwestie", "57,7% stemt voor de terugkeer van Leopold III, met grote verschillen tussen Vlaanderen en Wallonie.", "Onlusten; Leopold draagt zijn macht over aan Boudewijn.", W + "Royal_question"),
        E("1951-07-16", "dag", "Troonsafstand Leopold III", "Leopold III doet afstand; Boudewijn legt op 17 juli de eed af.", "Einde van de Koningskwestie.", "https://www.ebsco.com/research-starters/history/belgiums-disgraced-king-leopold-iii-abdicates"),
        E("1960-06-30", "dag", "Onafhankelijkheid van Congo", "Belgisch-Congo wordt onafhankelijk (dag NIET NAGEKEKEN in deze ronde, algemeen bekend).", "Einde van de kolonie.", "https://www.universalis.fr/encyclopedie/baudouin-ier-1930-1993-roi-des-belges-1951-1993/", True),
        E("1962-11-08", "dag", "Vastlegging taalgrens", "Voeren gaat naar Limburg, Komen en Moeskroen naar Henegouwen.", "Vaste taalgrens; provinciegrenzen aangepast.", "https://www.dekamer.be/FLWB/pdf/digidoc/DPS/K2002/K20023871/K20023871.pdf"),
        E("1970-12-24", "jaar", "Eerste staatshervorming", "Cultuurgemeenschappen worden opgericht (dag NIET NAGEKEKEN).", "Begin van de federalisering.", W + "State_reform_in_Belgium"),
        E("1977-01-01", "dag", "Fusie van gemeenten", "Het aantal gemeenten daalt van 2359 naar 596 (589 na Antwerpen in 1983).", "Nieuwe gemeentegrenzen.", W + "Fusion_of_the_Belgian_municipalities"),
        E("1980-08-08", "jaar", "Tweede staatshervorming", "Gewesten worden opgericht (dag NIET NAGEKEKEN; Brussels Gewest pas 1989).", "Vlaams en Waals Gewest.", W + "State_reform_in_Belgium"),
        E("1993-01-01", "jaar", "Federale staat", "Na de vierde staatshervorming (Sint-Michielsakkoord) wordt Belgie een federale staat; Brabant wordt gesplitst (1995, NIET NAGEKEKEN).", "Rechtstreeks verkozen deelparlementen; nieuwe provincies Vlaams- en Waals-Brabant.", W + "State_reform_in_Belgium"),
        E("2001-01-01", "jaar", "Vijfde staatshervorming", "Lambermont- en Lombardakkoord.", "Meer bevoegdheden en geld voor gewesten.", W + "State_reform_in_Belgium"),
        E("2011-10-11", "jaar", "Zesde staatshervorming", "Splitsing van Brussel-Halle-Vilvoorde en meer bevoegdheden voor deelstaten (2011-2014).", "Kieskring BHV gesplitst.", W + "State_reform_in_Belgium"),
        E("2019-01-01", "dag", "Vlaamse fusies 2019", "Vlaanderen gaat van 308 naar 300 gemeenten.", "Nieuwe gemeenten in Vlaanderen.", "https://www.vrt.be/vrtnws/nl/2018/09/14/explainer-fusiegemeenten/"),
        E("2025-01-01", "dag", "Vlaamse fusies 2025", "Vlaanderen gaat van 300 naar 285 gemeenten; in Wallonie fuseren Bastogne en Bertogne.", "Nieuwe gemeenten; Belgisch totaal niet bevestigd.", "https://www.vrt.be/vrtnws/nl/2024/12/27/vlaanderen-gemeentefusies/"),
    ],
    "versterkingen": [V("SHAPE (Casteau)", 50.50, 3.98), V("NAVO-hoofdkwartier (Evere)", 50.88, 4.43), V("Luchtmachtbasis Kleine-Brogel", 51.17, 5.47),
                      V("Luchtmachtbasis Florennes", 50.24, 4.65), V("Haven van Antwerpen", 51.26, 4.40), V("Haven van Zeebrugge", 51.33, 3.20)],
    "namen": ["Boudewijn", "Albert", "Filip", "Paola", "Fabiola", "Mathilde", "Elisabeth", "Gaston", "Paul-Henri", "Wilfried", "Jean-Luc", "Guy", "Elio", "Charles", "Alexander", "Bart"],
    "dynastieen": ["Saksen-Coburg (Belgie)", "Oranje-Nassau", "Nassau-Weilburg (Luxemburg)"],
})


import re
VERV = [("Bourgondiers","Bourgondiërs"),("Artesie","Artesië"),("Gallie","Gallië"),("Belgie","België"),("Wallonie","Wallonië"),
 ("Germanie","Germanië"),("Austrasie","Austrasië"),("Neustrie","Neustrië"),("Bourgondie","Bourgondië"),("Francie","Francië"),
 ("Toxandrie","Toxandrië"),("Provincien","Provinciën"),("Pyreneeen","Pyreneeën"),("Barriere","Barrière"),("barriere","barrière"),
 ("Therouanne","Thérouanne"),("Chalons","Châlons"),("Prum","Prüm"),("Gorlitz","Görlitz"),("Poincare","Poincaré"),
 ("Marie-Adelaide","Marie-Adélaïde"),("Brittannie","Brittannië"),("Blucher","Blücher"),("Walthere","Walthère"),
 ("Clementine","Clémentine"),("Orleans","Orléans"),("dynastieen","dynastieën"),("Pevelenberg","Pevelenberg")]
def fixs(x):
    if x.startswith("http"): return x
    parts = re.split(r"(https?://\S+)", x)
    out=[]
    for p_ in parts:
        if p_.startswith("http"): out.append(p_); continue
        for a_,b_ in VERV: p_ = re.sub(r"\b"+a_, b_, p_)
        p_ = re.sub(r"\bPrie\b","Prié",p_)
        out.append(p_)
    return "".join(out)
def walk(o, key=None):
    if isinstance(o, dict):
        return {k: (v if k in ("id","heer","oorlog","bond","datum","precisie","van","tot") else walk(v,k)) for k,v in o.items()}
    if isinstance(o, list): return [walk(v,key) for v in o]
    if isinstance(o, str): return fixs(o)
    return o
T = walk(T)
for t in T:  # relaties wederzijds maken
    fs = {f_["id"]: f_ for f_ in t["facties"]}
    for f_ in t["facties"]:
        for soort in ("oorlog", "bond"):
            for x in f_["relaties"][soort]:
                if f_["id"] not in fs[x]["relaties"][soort]:
                    fs[x]["relaties"][soort].append(f_["id"])
for t in T: t["gebeurtenissen"].sort(key=lambda e: (int(e["datum"][:-6]), e["datum"][-5:]))

# ------------------------------------------------------------- uitvoer
out_json, out_md = sys.argv[1], sys.argv[2]
with open(out_json, "w", encoding="utf-8") as f:
    json.dump({"versie": 1, "datum": "2026-11-17",
               "uitleg": "Per tijdperk de toestand bij de start en de belangrijkste gebeurtenissen. 'onzeker': true betekent betwist of niet nagekeken. Datums met precisie 'jaar' of 'maand' hebben een opvuldag (01). Coordinaten zijn benaderend.",
               "tijdperken": T}, f, ensure_ascii=False, indent=2)

L = []
a = L.append
a(open(sys.argv[3], encoding="utf-8").read())
for i, t in enumerate(T, 1):
    def js_(x):
        n = int(x)
        return f"{-n} v.Chr." if n < 0 else str(n)
    tot_ = "nu" if t["id"] == "na_de_oorlog" else js_(t["tot"])
    a(f"\n## {i}. {t['naam']} ({js_(t['van'])} - {tot_})\n")
    t["gebeurtenissen"].sort(key=lambda e: (int(e["datum"][:-6]), e["datum"][-5:]))
    a(f"**Grens:** {t['grens']}  \n**Toestand bij de start:** {t['startmoment']}  \n**Bevolking bij de start:** {t['bevolking']['waarde']} (bron: {t['bevolking']['bron']})\n")
    a("### Machten bij de start\n")
    a("| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |")
    a("|---|---|---|---|---|---|---|---|")
    for f_ in t["facties"]:
        r = f_["relaties"]
        rel = []
        if r["oorlog"]: rel.append("oorlog: " + ", ".join(r["oorlog"]))
        if r["bond"]: rel.append("bond: " + ", ".join(r["bond"]))
        if r["heer"]: rel.append("heer: " + r["heer"])
        geb = ", ".join(f_["gebieden"]) or "(buiten de kaart)"
        z = f_["zetel"]
        opm = f" *{f_['opmerking']}*" if f_["opmerking"] else ""
        a(f"| `{f_['id']}` | {f_['naam']} | {f_['soort']} | {f_['heerser']} | {geb} | {z['naam']} ({z['lat']}, {z['lon']}) | {'; '.join(rel) or '-'} | {f_['bron']}{opm} |")
    a("\n### Gebeurtenissen\n")
    a("| datum | gebeurtenis | gevolg | bron |")
    a("|---|---|---|---|")
    for e in t["gebeurtenissen"]:
        d = e["datum"]
        jaar = int(d[:5]) if d.startswith("-") else int(d[:4])
        js = f"{-jaar} v.Chr." if jaar < 0 else str(jaar)
        if e["precisie"] == "dag":
            ds = f"{int(d[-2:])}/{int(d[-5:-3])}/{js}"
        elif e["precisie"] == "maand":
            ds = f"{int(d[-5:-3])}/{js}"
        else:
            ds = js
        flag = "**ONZEKER** " if e["onzeker"] else ""
        a(f"| {ds} | {flag}**{e['titel']}**: {e['tekst']} | {e['gevolg']} | {e['bron']} |")
    a("\n### Versterkingen\n")
    a(", ".join(f"{v['naam']} ({v['lat']}, {v['lon']})" for v in t["versterkingen"]))
    a("\n### Namen en dynastieën\n")
    a("**Voornamen:** " + ", ".join(t["namen"]) + "  \n**Dynastieën:** " + ", ".join(t["dynastieen"]) + "\n")
with open(out_md, "w", encoding="utf-8") as f:
    f.write("\n".join(L) + "\n")
print("ok", len(T))
