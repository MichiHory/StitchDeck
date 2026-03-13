Utilita pro slučování souborů. utilita umí:

* Nahrávat soubory přetažením (drag & drop) na dropzonu
* Zachytávat kompletní cesty souborů přes skrytý textarea při přetažení
* Řadit soubory přetažením v seznamu (drag & drop reorder)
* Barevně odlišit typ souboru v seznamu podle přípony
* Odebírat jednotlivé soubory tlačítkem ✕
* Sloučit všechny soubory do jednoho textového výstupu ve formátu `cesta:\nobsah`
* Zobrazit sloučený výstup s číslováním řádků (čísla nejsou součástí textu — nejdou kopírovat)
* Zobrazit sloučený výstup s omezením na 20 000 řádků s upozorněním na zkrácení
* Zobrazit sloučený výstup se syntax highlightingem podle typu souboru (HTML, XML/SVG, JS, TS, TSX/JSX, PHP, JSON, YAML/YML, NEON, Latte, Blade, CSS/SCSS/LESS) — jazyk se detekuje z přípony v hlavičce každé sekce, názvy souborů jsou zvýrazněny neonově zeleně, highlighting je čistě vizuální a není součástí kopírovaného ani staženého textu
* Zkopírovat sloučený obsah do schránky (bez čísel řádků a bez syntax highlightingu)
* Stáhnout sloučený obsah jako `merged-files.txt`
* Vymazat vše (soubory i výstup) jedním tlačítkem
* Zobrazovat metadata výstupu (počet souborů, řádků, velikost)
* Zobrazovat toast notifikace pro zpětnou vazbu uživateli
