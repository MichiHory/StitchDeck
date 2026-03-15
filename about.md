Utilita pro slučování souborů. utilita umí:

* Spravovat projekty v pravém panelu — vytvářet, přepínat kliknutím, přejmenovávat a mazat projekty (inline tlačítka u každého projektu)
* Persistentně ukládat nahrané soubory do IndexedDB — soubory přežijí zavření prohlížeče
* Automaticky obnovit poslední aktivní projekt při spuštění aplikace
* Nahrávat soubory přetažením (drag & drop) — dropzona se zobrazí přes celou oblast hlavního obsahu (main-content) když projekt nemá žádné soubory, po přidání souborů se při přetahování zobrazí overlay přes celou viditelnou oblast main-content s fixní pozicí (neroste s obsahem)
* Zachytávat kompletní cesty souborů přes skrytý textarea při přetažení
* Řadit soubory přetažením v seznamu (drag & drop reorder)
* Barevně odlišit typ souboru v seznamu podle přípony
* Odebírat jednotlivé soubory tlačítkem ✕
* Sloučit všechny soubory do jednoho textového výstupu ve formátu `cesta:\nobsah`
* Přepínač pro zapnutí/vypnutí vkládání cesty k souboru do výstupu (defaultně zapnutý)
* Přepínač pro oříznutí prázdných řádků na začátku a konci obsahu každého souboru ve výstupu (defaultně vypnutý)
* Zobrazit sloučený výstup s číslováním řádků (čísla nejsou součástí textu — nejdou kopírovat)
* Zobrazit sloučený výstup s omezením na 20 000 řádků s upozorněním na zkrácení
* Zobrazit sloučený výstup se syntax highlightingem podle typu souboru (HTML, XML/SVG, JS, TS, TSX/JSX, PHP, JSON, YAML/YML, NEON, Latte, Blade, CSS/SCSS/LESS) — jazyk se detekuje z přípony v hlavičce každé sekce, názvy souborů jsou zvýrazněny neonově zeleně, highlighting je čistě vizuální a není součástí kopírovaného ani staženého textu
* Zkopírovat sloučený obsah do schránky (bez čísel řádků a bez syntax highlightingu)
* Stáhnout sloučený obsah jako `merged-files.txt`
* Vymazat vše (soubory i výstup) jedním tlačítkem — s potvrzovacím dialogem
* Zobrazovat metadata výstupu (počet souborů, řádků, velikost)
* Zobrazovat toast notifikace pro zpětnou vazbu uživateli (pozicované dole uprostřed) — úspěšné akce mají zelené pozadí s bílým textem a checkmarkem, varovné/chybové zůstávají žluté
* Při aktualizaci již nahraného souboru zobrazit vizuální efekt — starý box se rozpadne na zelené částice (particle burst), které se rozletí do okolí, a nový box se nafoukne jako bublina (grow-in animace)
* Modalni okna pro akce